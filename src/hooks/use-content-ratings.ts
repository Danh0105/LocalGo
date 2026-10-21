import { useEffect, useState } from "react";
import { getContentRatings } from "@/services/content-reviews";
import type { ContentReviewType } from "@/types/content-reviews";

export function useContentRatings(
  type: ContentReviewType,
  items: { id: string }[],
) {
  const [ratings, setRatings] = useState<
    Record<string, { average: number; total: number }>
  >({});
  const idsKey = JSON.stringify(items.map((item) => item.id));
  useEffect(() => {
    const controller = new AbortController();
    setRatings({});
    const ids: string[] = JSON.parse(idsKey);
    if (ids.length) {
      getContentRatings(type, ids, controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) setRatings(value);
        })
        .catch(() => {
          // Ratings are supplementary; never replace a working content list with an error.
        });
    }
    return () => controller.abort();
  }, [type, idsKey]);
  return ratings;
}
