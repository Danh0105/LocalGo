import { useCallback, useEffect, useRef, useState } from "react";
import {
  getContentReviews,
  getContentReviewSummary,
} from "@/services/content-reviews";
import { getApiErrorMessage } from "@/lib/http-client";
import type {
  ContentReview,
  ContentReviewSummary,
  ContentReviewType,
} from "@/types/content-reviews";
import type { PaginationMeta } from "@/types/api";

export function useContentReviews(type: ContentReviewType, id: string) {
  const [items, setItems] = useState<ContentReview[]>([]);
  const [summary, setSummary] = useState<ContentReviewSummary | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const controllerRef = useRef<AbortController>();
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    busy.current = true;
    setLoading(true);
    setError("");
    setItems([]);
    setMeta(null);
    setSummary(null);
    Promise.all([
      getContentReviews(type, id, {
        sortOrder: sort,
        signal: controller.signal,
      }),
      getContentReviewSummary(type, id, controller.signal),
    ])
      .then(([list, score]) => {
        if (!controller.signal.aborted) {
          setItems(list.items);
          setMeta(list.meta);
          setSummary(score);
        }
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
    return () => controller.abort();
  }, [type, id, sort, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  async function loadMore() {
    if (busy.current || !meta || meta.page >= meta.totalPages) return;
    const controller = controllerRef.current;
    if (!controller || controller.signal.aborted) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await getContentReviews(type, id, {
        page: meta.page + 1,
        sortOrder: sort,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setItems((current) => [
          ...new Map(
            [...current, ...result.items].map((item) => [item.id, item]),
          ).values(),
        ]);
        setMeta(result.meta);
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(e));
    } finally {
      if (!controller.signal.aborted) {
        busy.current = false;
        setLoading(false);
      }
    }
  }
  return {
    items,
    summary,
    meta,
    sort,
    setSort,
    loading,
    error,
    reload,
    loadMore,
  };
}
