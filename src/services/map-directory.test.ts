import { afterEach, describe, expect, it, vi } from "vitest";
import { coordinatesFromMapsUrl, getMapDirectory } from "./map-directory";

afterEach(() => vi.unstubAllGlobals());
const link = "https://maps.app.goo.gl/temple";
const base = { id: "same", name: "Địa điểm", category: "Du lịch", address: "Truông Mít", summary: "", description: [], highlights: [], imageUrl: null };

function mockSources(failed?: string) {
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    const source = new URL(input).pathname.split("/").pop();
    if (source === failed) throw new Error("OFFLINE");
    const data = source === "map-places" ? [
      { ...base, googleMapsUrl: "https://maps.google.com/?q=11.2,106.2", coordinates: { lat: 1, lng: 2 }, mapLocation: { status: "resolved", coordinates: { lat: 12, lng: 107 }, resolvedAt: "2026-10-20T08:00:00.000Z" } },
      { ...base, id: "no-link" },
    ] : source === "cuisine" ? [{ ...base, googleMapsUrl: "https://maps.app.goo.gl/dish", suggestedPlaceDetails: [
      { id: "a", name: "Quán A", address: "Đường A", googleMapsUrl: "https://maps.app.goo.gl/restaurant" },
      { id: "b", name: "Quán B", address: "", googleMapsUrl: null },
      { id: "c", name: "Quán C", address: "", googleMapsUrl: "https://evil.test/maps" },
    ] }] : source === "temples" ? [{ ...base, googleMapsUrl: ` ${link} ` }] : [{ ...base, googleMapsUrl: link }];
    return { ok: true, json: async () => ({ success: true, data }) };
  }));
}

describe("map directory aggregation", () => {
  it("collects all sources, keeps restaurant URLs independent, filters missing links and merges shared links", async () => {
    mockSources();
    const result = await getMapDirectory();
    expect(result.failedSources).toEqual([]);
    expect(result.places).toHaveLength(4);
    expect(result.places.find(place => place.name === "Quán A")?.googleMapsUrl).toBe("https://maps.app.goo.gl/restaurant");
    expect(result.places.find(place => place.name === "Quán B")).toBeUndefined();
    expect(result.places.find(place => place.name === "Quán C")).toBeUndefined();
    expect(result.places.find(place => place.googleMapsUrl === link)?.categories).toEqual(["Đền miếu", "Du lịch"]);
    expect(result.places[0].coordinates).toEqual([12, 107]);
    expect(result.places.find(place => place.googleMapsUrl === link)?.coordinates).toBeUndefined();
  });

  it("retains successful sources and reports a failed source", async () => {
    mockSources("temples");
    const result = await getMapDirectory();
    expect(result.failedSources).toEqual(["Đền miếu"]);
    expect(result.places.some(place => place.name === "Quán A")).toBe(true);
  });
});

describe("destination coordinates", () => {
  it.each([
    ["https://www.google.com/maps/place/Test/@1,2,13z/data=!3d11.2!4d106.3", [11.2, 106.3]],
    ["https://www.google.com/maps/search/?api=1&query=-10.25,106.5", [-10.25, 106.5]],
    ["https://www.google.com/maps/dir/?api=1&destination=11,106", [11, 106]],
    ["https://www.google.com/maps/place/Test/@11,106,14z", undefined],
    ["https://maps.app.goo.gl/test", undefined],
    ["https://maps.google.com/?q=91,106", undefined],
    ["https://maps.google.com/?q=11,181", undefined],
    ["https://evil.test/maps?q=11,106", undefined],
  ])("parses %s without inventing a position", (url, expected) => {
    expect(coordinatesFromMapsUrl(url)).toEqual(expected);
  });
});
