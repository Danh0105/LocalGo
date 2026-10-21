import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "zmp-ui";
import { isTradePostAvailable, subscribeTradePostInvalidation } from "@/lib/trade-post-availability";

export function useTradeListLifecycle<T extends { slug?: string | null }>(
  setItems: Dispatch<SetStateAction<T[]>>,
) {
  const { pathname } = useLocation();
  useEffect(() => subscribeTradePostInvalidation(() => {
    setItems((items) => items.filter(isTradePostAvailable));
  }), [setItems]);
  // AnimationRoutes can retain a previous screen during navigation.
  // Including pathname in the fetch effect revalidates it on return as well.
  return pathname;
}
