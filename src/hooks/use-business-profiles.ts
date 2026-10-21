import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "zmp-ui";
import { getApiErrorMessage } from "@/lib/http-client";
import { businessProfileKeys, getBusinessProfileRevision, readBusinessProfileCache, subscribeBusinessProfiles } from "@/lib/business-profile-cache";
import { businessProfileQueryString, getBusinessProfiles } from "@/services/business-profiles";
import type { BusinessProfile, BusinessType } from "@/types/business-profiles";
import type { PaginationMeta } from "@/types/api";

export function useBusinessProfiles() {
  const [keyword, setKeyword] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [items, setItems] = useState<BusinessProfile[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const revision = useSyncExternalStore(subscribeBusinessProfiles, getBusinessProfileRevision);
  const { pathname } = useLocation();
  const controllerRef = useRef<AbortController>();
  const busy = useRef(false);
  const search = keyword.trim();

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    const cached = readBusinessProfileCache<{ items: BusinessProfile[]; meta: PaginationMeta }>(businessProfileKeys.list(businessProfileQueryString({ businessType: businessType || undefined, search, page: 1 })));
    setItems(cached?.items ?? []); setMeta(cached?.meta ?? null); setLoading(true); setError(""); setLoadMoreFailed(false); busy.current = true;
    const timer = window.setTimeout(() => {
      getBusinessProfiles({ businessType: businessType || undefined, search, page: 1 }, controller.signal)
        .then((result) => { if (!controller.signal.aborted) { setItems(result.items); setMeta(result.meta); } })
        .catch((e) => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)); })
        .finally(() => { if (!controller.signal.aborted) { setLoading(false); busy.current = false; } });
    }, search ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [businessType, search, retry, revision, pathname]);

  async function loadMore() {
    const controller = controllerRef.current;
    if (busy.current || !meta || meta.page >= meta.totalPages || !controller || controller.signal.aborted) return;
    busy.current = true; setLoading(true); setError(""); setLoadMoreFailed(false);
    try {
      const result = await getBusinessProfiles({ businessType: businessType || undefined, search, page: meta.page + 1 }, controller.signal);
      if (!controller.signal.aborted) {
        setItems((current) => [...new Map([...current, ...result.items].map((item) => [item.id, item])).values()]);
        setMeta(result.meta);
      }
    } catch (e) { if (!controller.signal.aborted) { setError(getApiErrorMessage(e)); setLoadMoreFailed(true); } }
    finally { if (!controller.signal.aborted) { busy.current = false; setLoading(false); } }
  }
  const reload = () => setRetry((value) => value + 1);
  return { keyword, setKeyword, businessType, setBusinessType, items, meta, loading, error, loadMore, reload, retryError: loadMoreFailed ? () => void loadMore() : reload };
}
