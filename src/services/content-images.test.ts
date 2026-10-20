import { afterEach, describe, expect, it, vi } from "vitest";
import { getFestivalById } from "./festivals";
import { getNewsArticleById } from "./news";
import { getExperienceTourById } from "./experience-tours";
import { getCraftVillageById } from "./craft-villages";
import { getContactById } from "./contacts";
import { getAgricultureItemById } from "./agriculture";
import { getHistoricalSiteById } from "./historical-sites";
import { getSpecialtyById } from "./specialties";

afterEach(() => vi.unstubAllGlobals());
const galleryImages = [
  { mediaId: "b", imageUrl: "/b.jpg", thumbnailUrl: "/b-thumb.jpg", sortOrder: 2 },
  { mediaId: "a", imageUrl: "/a.jpg", thumbnailUrl: null, sortOrder: 0 },
];
const fixture = { id: "sample", name: "Sample", imageUrl: "/cover.jpg", imageAlt: "Ảnh đại diện", publishedAt: "2026-10-20T08:00:00Z" };

describe.each([
  ["festivals", getFestivalById], ["news", getNewsArticleById],
  ["experience-tours", getExperienceTourById], ["craft-villages", getCraftVillageById],
  ["contacts", getContactById], ["agriculture", getAgricultureItemById],
  ["historical-sites", getHistoricalSiteById], ["specialties", getSpecialtyById],
] as const)("%s content images", (_, load) => {
  it("maps the cover separately and preserves the ordered gallery", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { ...fixture, galleryImages } }) }));
    const result = await load("sample");
    expect(result?.image).toBe("/cover.jpg");
    expect(result?.imageAlt).toBe("Ảnh đại diện");
    expect(result?.galleryImages?.map(image => image.mediaId)).toEqual(["a", "b"]);
    expect(result?.galleryImages?.[1].thumbnailUrl).toBe("/b-thumb.jpg");
  });

  it("defaults missing gallery data to an empty array for legacy responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: fixture }) }));
    expect((await load("sample"))?.galleryImages).toEqual([]);
  });
});
