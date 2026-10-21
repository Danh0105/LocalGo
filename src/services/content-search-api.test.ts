import { afterEach, describe, expect, it, vi } from "vitest";
import { searchAll } from "./search";
import {
  deleteContentReview,
  getContentRatings,
  getContentReviews,
  saveContentReview,
} from "./content-reviews";
import { apiRequest } from "@/lib/http-client";

afterEach(() => vi.unstubAllGlobals());
const meta = { page: 2, limit: 10, total: 12, totalPages: 2 };
const jsonResponse = (data: unknown, extra = {}) =>
  new Response(JSON.stringify({ success: true, data, ...extra }), {
    headers: { "Content-Type": "application/json" },
  });

describe("content and search API contracts", () => {
  it("retains search pagination and encodes the trimmed keyword and resource filters", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse([], { meta }));
    vi.stubGlobal("fetch", fetch);
    const result = await searchAll("  chùa & miếu  ", {
      page: 2,
      types: ["TEMPLE", "OCOP"],
    });
    expect(result).toEqual({ items: [], meta });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/search");
    expect(url.searchParams.get("q")).toBe("chùa & miếu");
    expect(url.searchParams.get("types")).toBe("TEMPLE,OCOP");
    expect(url.searchParams.get("page")).toBe("2");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("preserves list metadata and does not drop existing public request data", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([{ id: "review" }], { meta }))
        .mockResolvedValueOnce(jsonResponse({ name: "Test" })),
    );
    expect(await getContentReviews("temples", "chua", { page: 2 })).toEqual({
      items: [{ id: "review" }],
      meta,
    });
    expect(await apiRequest("/test")).toEqual({ name: "Test" });
  });

  it("creates and edits with Bearer auth and sends an explicit empty image replacement", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ id: "review" })),
      );
    vi.stubGlobal("fetch", fetch);
    const input = { rating: 5, content: "Trải nghiệm tốt", imageIds: [] };
    await saveContentReview("experience-tours", "tour a", "token", input);
    await saveContentReview(
      "experience-tours",
      "tour a",
      "token",
      input,
      "review",
    );
    expect(fetch.mock.calls[0][0]).toContain(
      "/content-reviews/experience-tours/tour%20a",
    );
    expect(fetch.mock.calls[0][1].method).toBe("POST");
    expect(fetch.mock.calls[1][0]).toContain("/content-reviews/review");
    expect(fetch.mock.calls[1][1]).toMatchObject({
      method: "PATCH",
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify(input),
    });
  });

  it("accepts a 204 delete and exposes API conflict errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: false,
              error: { code: "REVIEW_ALREADY_EXISTS", message: "Đã đánh giá" },
            }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          ),
        ),
    );
    await expect(
      deleteContentReview("review", "token"),
    ).resolves.toBeUndefined();
    await expect(
      saveContentReview("temples", "chua", "token", {
        rating: 5,
        content: "Tốt",
      }),
    ).rejects.toMatchObject({ status: 409, code: "REVIEW_ALREADY_EXISTS" });
  });

  it("batches card ratings at 100 IDs and preserves request order including unrated items", async () => {
    const fetch = vi.fn().mockImplementation((path: string) => {
      const ids = new URL(path).searchParams.get("ids")!.split(",");
      return Promise.resolve(
        jsonResponse(
          ids.map((id) => ({
            average: Number(id) === 0 ? 0 : 4.5,
            total: Number(id) === 0 ? 0 : 2,
          })),
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const ratings = await getContentRatings(
      "temples",
      Array.from({ length: 101 }, (_, index) => String(index)),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(ratings["0"]).toEqual({ average: 0, total: 0 });
    expect(ratings["100"]).toEqual({ average: 4.5, total: 2 });
  });
});
