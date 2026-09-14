export type TradePostCategory = string;
export type TradePostPriceType = "FIXED" | "NEGOTIABLE" | "CONTACT";
export type TradePostStatus =
  | "DRAFT"
  | "PENDING"
  | "PUBLISHED"
  | "HIDDEN"
  | "REJECTED"
  | "EXPIRED"
  | "ARCHIVED";

export interface TradePostPayload {
  category: TradePostCategory;
  title: string;
  summary: string;
  description: string;
  priceType: TradePostPriceType;
  price?: number;
  priceLabel?: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactZalo?: string;
  imageIds?: string[];
  promotionPercent?: number;
  promotionStartAt?: string;
  promotionEndAt?: string;
  expiresAt?: string;
}

export type TradePostUpdatePayload = Partial<TradePostPayload>;

export interface TradePostImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  sortOrder: number;
}

export interface TradePostCategoryInfo {
  id: string;
  code: TradePostCategory;
  name: string;
  description: string | null;
  sortOrder: number;
  requiresPromotionDetails: boolean;
}

export interface TradePostOwner {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "USER" | "BUSINESS" | "MODERATOR" | "ADMIN";
  status: "ACTIVE" | "BLOCKED" | "PENDING";
}

export interface TradePostResponse {
  id: string;
  slug: string;
  ownerId: string;
  category: TradePostCategory;
  categoryInfo?: TradePostCategoryInfo;
  title: string;
  summary: string;
  description: string;
  priceType: TradePostPriceType;
  price: string | null;
  priceLabel: string | null;
  address: string;
  lat: string | null;
  lng: string | null;
  contactName: string;
  contactPhone: string;
  contactZalo: string | null;
  status: TradePostStatus;
  thumbnailUrl: string | null;
  featured: boolean;
  promotionPercent: number | null;
  promotionStartAt: string | null;
  promotionEndAt: string | null;
  expiresAt: string | null;
  viewCount: number;
  averageRating: string;
  reviewCount: number;
  publishedAt: string | null;
  rejectedReason: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images?: TradePostImage[];
  owner?: TradePostOwner;
}

export type TradePostSortBy =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "popular";

export interface TradePostQuery {
  page?: number;
  limit?: number;
  category?: TradePostCategory;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  sortBy?: TradePostSortBy;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TradePostsPage {
  items: TradePostResponse[];
  meta: PaginationMeta;
}

export interface TradeReviewImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  sortOrder: number;
}

export interface TradeReviewResponse {
  id: string;
  tradePostId: string;
  userId: string;
  rating: number;
  content: string;
  status: "PENDING" | "PUBLISHED" | "HIDDEN";
  createdAt: string;
  updatedAt: string;
  images: TradeReviewImage[];
}

export interface TradeReviewSummary {
  average: number;
  total: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  counts: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface TradeReviewPayload {
  rating: number;
  content: string;
  imageIds?: string[];
}

interface UploadedMedia {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  size: number;
  mimeType: string;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

export class TradePostRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "TradePostRequestError";
    this.status = status;
    this.code = code;
  }
}

export const TRADE_POST_CATEGORY_INVALID_MESSAGE =
  "Danh mục không hợp lệ hoặc hiện không còn được sử dụng. Vui lòng chọn danh mục khác.";

const LEGACY_TRADE_POST_CATEGORY_LABELS: Record<string, string> = {
  PRODUCT: "Sản phẩm",
  SERVICE: "Dịch vụ",
  BUY_REQUEST: "Cần mua",
  PROMOTION: "Khuyến mãi",
};

export const FALLBACK_TRADE_POST_CATEGORIES: readonly TradePostCategoryInfo[] = [
  {
    id: "fallback-PRODUCT",
    code: "PRODUCT",
    name: LEGACY_TRADE_POST_CATEGORY_LABELS.PRODUCT,
    description: "Tin giao thương địa phương",
    sortOrder: 0,
    requiresPromotionDetails: false,
  },
  {
    id: "fallback-SERVICE",
    code: "SERVICE",
    name: LEGACY_TRADE_POST_CATEGORY_LABELS.SERVICE,
    description: "Tin giao thương địa phương",
    sortOrder: 1,
    requiresPromotionDetails: false,
  },
  {
    id: "fallback-BUY_REQUEST",
    code: "BUY_REQUEST",
    name: LEGACY_TRADE_POST_CATEGORY_LABELS.BUY_REQUEST,
    description: "Tin giao thương địa phương",
    sortOrder: 2,
    requiresPromotionDetails: false,
  },
  {
    id: "fallback-PROMOTION",
    code: "PROMOTION",
    name: LEGACY_TRADE_POST_CATEGORY_LABELS.PROMOTION,
    description: "Tin giao thương địa phương",
    sortOrder: 3,
    requiresPromotionDetails: true,
  },
];

export function isTradePostCategoryInvalidError(error: unknown): boolean {
  return (
    error instanceof TradePostRequestError &&
    error.code === "TRADE_POST_CATEGORY_INVALID"
  );
}

export function getTradePostCategoryName(
  category: TradePostCategory,
  categoryInfo?: Pick<TradePostCategoryInfo, "name"> | null
): string {
  return (
    categoryInfo?.name?.trim() ||
    LEGACY_TRADE_POST_CATEGORY_LABELS[category] ||
    category
  );
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.localgo.skilltripx.com.vn/api/v1";
const API_ORIGIN = new URL(API_BASE_URL).origin;

export function resolveTradeMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value, API_ORIGIN).toString();
  } catch {
    return null;
  }
}

function normalizeTradePost(post: TradePostResponse): TradePostResponse {
  return {
    ...post,
    thumbnailUrl: resolveTradeMediaUrl(post.thumbnailUrl),
    images: post.images
      ?.slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((image) => ({
        ...image,
        url: resolveTradeMediaUrl(image.url) ?? image.url,
        thumbnailUrl: resolveTradeMediaUrl(image.thumbnailUrl),
      })),
    owner: post.owner
      ? {
          ...post.owner,
          avatarUrl: resolveTradeMediaUrl(post.owner.avatarUrl),
        }
      : undefined,
  };
}

function normalizeTradeReview(review: TradeReviewResponse): TradeReviewResponse {
  return {
    ...review,
    images: review.images.map((image) => ({
      ...image,
      url: resolveTradeMediaUrl(image.url) ?? image.url,
      thumbnailUrl: resolveTradeMediaUrl(image.thumbnailUrl),
    })),
  };
}

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });
  } catch {
    throw new TradePostRequestError("Không thể kết nối tới máy chủ.", 0);
  }

  let body: ApiEnvelope<T> | ApiErrorEnvelope | undefined;
  try {
    body = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
  } catch {
    body = undefined;
  }

  if (!response.ok || !body?.success) {
    throw new TradePostRequestError(
      body && !body.success ? body.error.message : "Không thể xử lý tin đăng.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }

  return body.data;
}

async function publicEnvelopeRequest<T>(
  path: string,
  signal?: AbortSignal
): Promise<ApiEnvelope<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { signal });
  } catch {
    throw new TradePostRequestError("Không thể kết nối tới máy chủ.", 0);
  }

  let body: ApiEnvelope<T> | ApiErrorEnvelope | undefined;
  try {
    body = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
  } catch {
    body = undefined;
  }

  if (!response.ok || !body?.success) {
    throw new TradePostRequestError(
      body && !body.success
        ? body.error.message
        : "Không thể tải tin giao thương.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }

  return body;
}

async function publicRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  const body = await publicEnvelopeRequest<T>(path, signal);
  return body.data;
}

export function getTradePostCategories(
  signal?: AbortSignal
): Promise<TradePostCategoryInfo[]> {
  return publicRequest<TradePostCategoryInfo[]>(
    "/trade-post-categories",
    signal
  );
}

export async function getTradePosts(
  query: TradePostQuery = {},
  signal?: AbortSignal
): Promise<TradePostsPage> {
  const searchParams = new URLSearchParams();
  if (query.page !== undefined) searchParams.set("page", String(query.page));
  if (query.limit !== undefined) searchParams.set("limit", String(query.limit));
  if (query.category) searchParams.set("category", query.category);
  if (query.search) searchParams.set("search", query.search);
  if (query.minPrice !== undefined) {
    searchParams.set("minPrice", String(query.minPrice));
  }
  if (query.maxPrice !== undefined) {
    searchParams.set("maxPrice", String(query.maxPrice));
  }
  if (query.featured !== undefined) {
    searchParams.set("featured", String(query.featured));
  }
  if (query.sortBy) searchParams.set("sortBy", query.sortBy);
  if (query.sortOrder) searchParams.set("sortOrder", query.sortOrder);
  const queryString = searchParams.toString();
  const body = await publicEnvelopeRequest<TradePostResponse[]>(
    `/trade-posts${queryString ? `?${queryString}` : ""}`,
    signal
  );
  const fallbackPage = query.page ?? 1;
  const fallbackLimit = query.limit ?? 20;
  return {
    items: body.data.map(normalizeTradePost),
    meta: body.meta ?? {
      page: fallbackPage,
      limit: fallbackLimit,
      total: body.data.length,
      totalPages:
        body.data.length < fallbackLimit ? fallbackPage : fallbackPage + 1,
    },
  };
}

export async function getTradePostDetail(
  idOrSlug: string,
  signal?: AbortSignal
): Promise<TradePostResponse> {
  const post = await publicRequest<TradePostResponse>(
    `/trade-posts/${encodeURIComponent(idOrSlug)}`,
    signal
  );
  return normalizeTradePost(post);
}

export function getPublishedTradeReviews(
  tradePostId: string,
  signal?: AbortSignal
): Promise<TradeReviewResponse[]> {
  return publicRequest<TradeReviewResponse[]>(
    `/trade-posts/${encodeURIComponent(tradePostId)}/reviews?page=1&limit=100`,
    signal
  ).then((reviews) => reviews.map(normalizeTradeReview));
}

export function getTradeReviewSummary(
  tradePostId: string,
  signal?: AbortSignal
): Promise<TradeReviewSummary> {
  return publicRequest<TradeReviewSummary>(
    `/trade-posts/${encodeURIComponent(tradePostId)}/reviews/summary`,
    signal
  );
}

export function createTradeReview(
  accessToken: string,
  tradePostId: string,
  payload: TradeReviewPayload
): Promise<TradeReviewResponse> {
  return request<TradeReviewResponse>(
    `/trade-posts/${encodeURIComponent(tradePostId)}/reviews`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function uploadTradePostImage(
  accessToken: string,
  file: File
): Promise<UploadedMedia> {
  const body = new FormData();
  body.append("file", file);
  return request<UploadedMedia>("/media/images", accessToken, {
    method: "POST",
    body,
  });
}

export function createTradePost(
  accessToken: string,
  payload: TradePostPayload
): Promise<TradePostResponse> {
  return request<TradePostResponse>("/trade-posts", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateTradePost(
  accessToken: string,
  id: string,
  payload: TradePostUpdatePayload
): Promise<TradePostResponse> {
  return request<TradePostResponse>(
    `/trade-posts/${encodeURIComponent(id)}`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function submitTradePost(
  accessToken: string,
  id: string
): Promise<TradePostResponse> {
  return request<TradePostResponse>(
    `/trade-posts/${encodeURIComponent(id)}/submit`,
    accessToken,
    { method: "PATCH" }
  );
}
