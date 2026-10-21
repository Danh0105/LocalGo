import { useTradeListLifecycle } from "@/hooks/use-trade-list-lifecycle";
import { useEffect, useRef, useState } from "react";
import {
  getTradePosts,
  type TradePostResponse,
  type TradePostSection,
  type TradePostSortBy,
  type PaginationMeta,
} from "@/services/trade-posts";

export interface SectionTradeFilters {
  category: string;
  featured: boolean;
  minPrice?: number;
  maxPrice?: number;
}
export const EMPTY_TRADE_FILTERS: SectionTradeFilters = {
  category: "",
  featured: false,
};

export function useSectionTradePosts(section: TradePostSection) {
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<TradePostSortBy>("newest");
  const [filters, setFilters] =
    useState<SectionTradeFilters>(EMPTY_TRADE_FILTERS);
  const { category, featured, minPrice, maxPrice } = filters;
  const [items, setItems] = useState<TradePostResponse[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const listPathname = useTradeListLifecycle(setItems);
  const controllerRef = useRef<AbortController>();
  const busy = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(keyword.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setItems([]);
    setMeta(null);
    setError("");
    setLoading(true);
    busy.current = true;
    getTradePosts(
      {
        section,
        page: 1,
        limit: 10,
        search: search || undefined,
        sortBy,
        category: category || undefined,
        ...(section !== "temples" ? { minPrice, maxPrice } : {}),
        ...(featured ? { featured: true } : {}),
      },
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setItems(result.items);
          setMeta(result.meta);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Không thể tải tin giao thương.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          busy.current = false;
        }
      });
    return () => controller.abort();
  }, [
    listPathname,
    section,
    search,
    sortBy,
    category,
    featured,
    minPrice,
    maxPrice,
    revision,
  ]);

  async function loadMore() {
    const controller = controllerRef.current;
    if (
      busy.current ||
      !meta ||
      meta.page >= meta.totalPages ||
      !controller ||
      controller.signal.aborted
    )
      return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await getTradePosts(
        {
          section,
          page: meta.page + 1,
          limit: 10,
          search: search || undefined,
          sortBy,
          category: category || undefined,
          ...(section !== "temples" ? { minPrice, maxPrice } : {}),
          ...(featured ? { featured: true } : {}),
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setItems((current) => [
          ...new Map(
            [...current, ...result.items].map((item) => [item.id, item]),
          ).values(),
        ]);
        setMeta(result.meta);
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Không thể tải thêm tin.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        busy.current = false;
      }
    }
  }

  return {
    keyword,
    setKeyword,
    search,
    sortBy,
    setSortBy,
    featured,
    setFeatured: (value: boolean) =>
      setFilters((current) => ({ ...current, featured: value })),
    filters,
    setFilters,
    setCategory: (value: string) =>
      setFilters((current) => ({ ...current, category: value })),
    clearFilters: () => setFilters(EMPTY_TRADE_FILTERS),
    activeFilterCount:
      Number(Boolean(category)) +
      Number(featured) +
      Number(minPrice !== undefined || maxPrice !== undefined),
    items,
    meta,
    loading,
    error,
    loadMore,
    reload: () => setRevision((value) => value + 1),
  };
}
