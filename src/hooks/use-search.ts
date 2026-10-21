import { useEffect, useRef, useState } from "react";
import { searchAll } from "@/services/search";
import { getApiErrorMessage } from "@/lib/http-client";
import { isTradeSearchResultAvailable, subscribeTradePostInvalidation } from "@/lib/trade-post-availability";
import type { SearchResult } from "@/types/search";
import type { PaginationMeta } from "@/types/api";

export function useSearch(query: string, open: boolean) {
  const [items, setItems] = useState<SearchResult[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const controllerRef = useRef<AbortController>();
  const busy = useRef(false);
  const keyword = query.trim();

  useEffect(() => subscribeTradePostInvalidation(() => {
    setItems((current) => current.filter(isTradeSearchResultAvailable));
  }), []);

  useEffect(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setItems([]);
    setMeta(null);
    setPage(1);
    setError("");
    setLoading(open && keyword.length >= 2);
    busy.current = open && keyword.length >= 2;
    if (!open || keyword.length < 2) return () => controller.abort();
    const timer = window.setTimeout(() => {
      searchAll(keyword, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) return;
          setItems(result.items);
          setMeta(result.meta);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(getApiErrorMessage(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
            busy.current = false;
          }
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [keyword, open, retry]);

  async function loadMore() {
    if (busy.current || !meta || page >= meta.totalPages) return;
    const controller = controllerRef.current;
    if (!controller || controller.signal.aborted) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await searchAll(keyword, {
        page: page + 1,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setItems((current) => [
        ...new Map(
          [...current, ...result.items].map((item) => [
            `${item.resourceType}:${item.id}`,
            item,
          ]),
        ).values(),
      ]);
      setPage(result.meta.page);
      setMeta(result.meta);
    } catch (e) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(e));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        busy.current = false;
      }
    }
  }

  return {
    items,
    meta,
    loading,
    error,
    loadMore,
    retry: () => setRetry((value) => value + 1),
  };
}
