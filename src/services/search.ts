import { apiPaginatedRequest } from "@/lib/http-client";
import { isTradeSearchResultAvailable } from "@/lib/trade-post-availability";
import type { SearchResourceType, SearchResult } from "@/types/search";

export async function searchAll(
  q: string,
  options: {
    types?: SearchResourceType[];
    page?: number;
    limit?: number;
    signal?: AbortSignal;
  } = {},
) {
  const params = new URLSearchParams({
    q: q.trim(),
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 30),
  });
  if (options.types?.length) params.set("types", options.types.join(","));
  const result = await apiPaginatedRequest<SearchResult>(`/search?${params}`, {
    signal: options.signal,
  });
  return { ...result, items: result.items.filter(isTradeSearchResultAvailable) };
}
