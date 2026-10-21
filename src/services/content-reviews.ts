import { apiPaginatedRequest, apiRequest } from "@/lib/http-client";
import type {
  ContentReview,
  ContentReviewInput,
  ContentReviewSummary,
  ContentReviewType,
} from "@/types/content-reviews";

const targetPath = (type: ContentReviewType, id: string) =>
  `/content-reviews/${type}/${encodeURIComponent(id)}`;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function getContentRatings(
  type: ContentReviewType,
  ids: string[],
  signal?: AbortSignal,
) {
  // The API guarantees one result per requested ID, in the same order.
  const batches = await Promise.all(
    Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => {
      const chunk = ids.slice(index * 100, index * 100 + 100);
      const params = new URLSearchParams({
        targetType: type,
        ids: chunk.join(","),
      });
      return apiRequest<{ average: number; total: number }[]>(
        `/content-reviews/ratings?${params}`,
        { signal },
      );
    }),
  );
  return Object.fromEntries(
    batches.flat().map((rating, index) => [ids[index], rating]),
  );
}

export function getContentReviews(
  type: ContentReviewType,
  id: string,
  options: {
    page?: number;
    sortOrder?: "asc" | "desc";
    signal?: AbortSignal;
  } = {},
) {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: "10",
    sortOrder: options.sortOrder ?? "desc",
  });
  return apiPaginatedRequest<ContentReview>(
    `${targetPath(type, id)}?${params}`,
    { signal: options.signal },
  );
}
export function getContentReviewSummary(
  type: ContentReviewType,
  id: string,
  signal?: AbortSignal,
) {
  return apiRequest<ContentReviewSummary>(`${targetPath(type, id)}/summary`, {
    signal,
  });
}
export function getMyContentReview(
  type: ContentReviewType,
  id: string,
  token: string,
  signal?: AbortSignal,
) {
  return apiRequest<ContentReview | null>(`${targetPath(type, id)}/me`, {
    headers: auth(token),
    signal,
  });
}
export function saveContentReview(
  type: ContentReviewType,
  id: string,
  token: string,
  input: ContentReviewInput,
  reviewId?: string,
) {
  return apiRequest<ContentReview>(
    reviewId
      ? `/content-reviews/${encodeURIComponent(reviewId)}`
      : targetPath(type, id),
    {
      method: reviewId ? "PATCH" : "POST",
      headers: { ...auth(token), "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}
export function deleteContentReview(reviewId: string, token: string) {
  return apiRequest<void>(`/content-reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
    headers: auth(token),
  });
}
export function getMyContentReviews(
  token: string,
  page = 1,
  signal?: AbortSignal,
) {
  return apiPaginatedRequest<ContentReview>(
    `/content-reviews/me?page=${page}&limit=10`,
    { headers: auth(token), signal },
  );
}
