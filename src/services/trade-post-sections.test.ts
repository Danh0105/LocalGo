import { afterEach, describe, expect, it, vi } from "vitest";
import { getTradePosts, type TradePostSection } from "./trade-posts";

afterEach(() => vi.unstubAllGlobals());
const meta = { page: 1, limit: 10, total: 0, totalPages: 0 };

describe("public trade post section queries", () => {
  it.each<TradePostSection>([
    "cuisine",
    "temples",
    "specialties",
    "agriculture",
  ])(
    "sends section=%s without deriving a category or requiring login",
    async (section) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true, data: [], meta })),
        );
      vi.stubGlobal("fetch", fetch);
      expect(await getTradePosts({ section, page: 1, limit: 10 })).toEqual({
        items: [],
        meta,
      });
      const url = new URL(fetch.mock.calls[0][0]);
      expect(url.pathname).toBe("/api/v1/trade-posts");
      expect(url.searchParams.get("section")).toBe(section);
      expect(url.searchParams.has("category")).toBe(false);
      expect(fetch.mock.calls[0][1].headers).toBeUndefined();
    },
  );

  it("combines section with the existing search, sorting, featured and pagination parameters", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [], meta })),
      );
    vi.stubGlobal("fetch", fetch);
    await getTradePosts({
      section: "specialties",
      search: "bưởi & cam",
      sortBy: "price_asc",
      featured: true,
      page: 2,
      limit: 10,
    });
    const params = new URL(fetch.mock.calls[0][0]).searchParams;
    for (const [key, value] of Object.entries({
      section: "specialties",
      search: "bưởi & cam",
      sortBy: "price_asc",
      featured: "true",
      page: "2",
      limit: "10",
    })) {
      expect(params.get(key)).toBe(value);
    }
  });

  it("leaves the general trade feed unscoped", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [], meta })),
      );
    vi.stubGlobal("fetch", fetch);
    await getTradePosts({ page: 1 });
    expect(new URL(fetch.mock.calls[0][0]).searchParams.has("section")).toBe(
      false,
    );
  });
});
