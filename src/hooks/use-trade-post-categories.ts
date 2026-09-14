import { useCallback, useEffect, useState } from "react";

import {
  FALLBACK_TRADE_POST_CATEGORIES,
  TradePostCategoryInfo,
  getTradePostCategories,
} from "@/services/trade-posts";

interface TradePostCategoriesState {
  categories: TradePostCategoryInfo[];
  isLoading: boolean;
  error: string;
  isFallback: boolean;
  reload: () => void;
}

export function useTradePostCategories(): TradePostCategoriesState {
  const [categories, setCategories] = useState<TradePostCategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setIsLoading(true);
    setError("");
    setIsFallback(false);

    void (async () => {
      try {
        const result = await getTradePostCategories(controller.signal);
        if (!active) return;
        setCategories(result);
        setIsFallback(false);
        if (result.length === 0) {
          setError("Chưa có danh mục tin đang hoạt động.");
        }
      } catch {
        if (!active) return;
        setCategories([...FALLBACK_TRADE_POST_CATEGORIES]);
        setIsFallback(true);
        setError(
          "Không thể tải danh mục mới. Mini app đang dùng danh mục mặc định."
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  return { categories, isLoading, error, isFallback, reload };
}
