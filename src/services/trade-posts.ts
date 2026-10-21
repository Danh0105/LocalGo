import { invalidateTradePost, isTradePostAvailable } from "@/lib/trade-post-availability";
import type { TradePostPurpose } from "@/services/business-applications";

export type TradePostCategory = string;
export type TradePostSection = "cuisine" | "temples" | "specialties" | "agriculture";
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
  purpose?: TradePostPurpose;
  eventEndAt?: string | null;
  category: TradePostCategory;
  title: string;
  summary: string;
  description: string;
  priceType?: TradePostPriceType;
  price?: number | null;
  priceLabel?: string | null;
  address: string;
  contactName: string;
  contactPhone: string;
  contactZalo?: string | null;
  imageIds?: string[];
  promotionPercent?: number | null;
  promotionStartAt?: string | null;
  promotionEndAt?: string | null;
  expiresAt?: string | null;
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
  purpose?: TradePostPurpose;
  eventEndAt?: string | null;
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
  saveCount: number;
  /** Present when the public endpoint receives a valid viewer token. */
  isSaved?: boolean;
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

export interface SavedTradePostResponse extends TradePostResponse {
  savedAt: string;
  isAvailable: boolean;
  isSaved: true;
}

export interface TradePostSaveResult {
  saved: boolean;
  saveCount: number;
}

export type TradePostSortBy =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "popular";

export interface TradePostQuery {
  section?: TradePostSection;
  page?: number;
  limit?: number;
  category?: TradePostCategory;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  sortBy?: TradePostSortBy;
  sortOrder?: "asc" | "desc";
  status?: TradePostStatus;
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

export interface TradeReviewCustomerReply {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

export interface TradeReviewResponse {
  id: string;
  tradePostId: string;
  userId: string;
  rating: number;
  content: string;
  status: "PENDING" | "PUBLISHED" | "HIDDEN";
  replyContent: string | null;
  repliedAt: string | null;
  customerReplies?: TradeReviewCustomerReply[];
  createdAt: string;
  updatedAt: string;
  images: TradeReviewImage[];
  reviewer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  tradePost: {
    id: string;
    title: string;
    slug: string;
  } | null;
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

export interface TradeAnalyticsTotals {
  views: number;
  uniqueVisitors: number;
  contactPhone: number;
  contactZalo: number;
  share: number;
  save: number;
}

export interface TradeAnalyticsPoint {
  date: string;
  views: number;
  contactPhone: number;
  contactZalo: number;
  share: number;
  save: number;
}

export interface TradeAnalyticsSummary {
  range: { from: string; to: string };
  postCount: number;
  totals: TradeAnalyticsTotals;
  reviews: { count: number };
  topPosts: Array<{
    tradePostId: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    views: number;
  }>;
  timeseries: TradeAnalyticsPoint[];
}

export interface TradeConversationUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface TradeConversationPost {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  status: TradePostStatus;
}

export interface TradeMessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface TradeConversationResponse {
  id: string;
  customerId: string;
  ownerId: string;
  tradePost: TradeConversationPost;
  counterpart: TradeConversationUser;
  lastMessage: TradeMessageResponse | null;
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
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

export function isTradePostExpiredError(error: unknown): boolean {
  return (
    error instanceof TradePostRequestError &&
    error.status === 409 &&
    error.code === "TRADE_POST_EXPIRED"
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
    customerReplies: review.customerReplies?.map(normalizeTradeReviewCustomerReply),
    images: review.images.map((image) => ({
      ...image,
      url: resolveTradeMediaUrl(image.url) ?? image.url,
      thumbnailUrl: resolveTradeMediaUrl(image.thumbnailUrl),
    })),
    reviewer: review.reviewer
      ? {
          ...review.reviewer,
          avatarUrl: resolveTradeMediaUrl(review.reviewer.avatarUrl),
        }
      : null,
  };
}

function normalizeTradeReviewCustomerReply(
  reply: TradeReviewCustomerReply
): TradeReviewCustomerReply {
  return {
    ...reply,
    author: reply.author
      ? { ...reply.author, avatarUrl: resolveTradeMediaUrl(reply.author.avatarUrl) }
      : null,
  };
}

function normalizeTradeConversation(
  conversation: TradeConversationResponse
): TradeConversationResponse {
  return {
    ...conversation,
    tradePost: {
      ...conversation.tradePost,
      thumbnailUrl: resolveTradeMediaUrl(conversation.tradePost.thumbnailUrl),
    },
    counterpart: {
      ...conversation.counterpart,
      avatarUrl: resolveTradeMediaUrl(conversation.counterpart.avatarUrl),
    },
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

  if (response.status === 204) return undefined as T;

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
  signal?: AbortSignal,
  accessToken?: string | null
): Promise<ApiEnvelope<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
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
      body && !body.success
        ? body.error.message
        : "Không thể tải tin giao thương.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }

  return body;
}

async function publicRequest<T>(
  path: string,
  signal?: AbortSignal,
  accessToken?: string | null
): Promise<T> {
  const body = await publicEnvelopeRequest<T>(path, signal, accessToken);
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
  signal?: AbortSignal,
  accessToken?: string | null
): Promise<TradePostsPage> {
  const searchParams = new URLSearchParams();
  if (query.section) searchParams.set("section", query.section);
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
    signal,
    accessToken
  );
  const fallbackPage = query.page ?? 1;
  const fallbackLimit = query.limit ?? 20;
  return {
    items: body.data.filter(isTradePostAvailable).map(normalizeTradePost),
    meta: body.meta ?? {
      page: fallbackPage,
      limit: fallbackLimit,
      total: body.data.length,
      totalPages:
        body.data.length < fallbackLimit ? fallbackPage : fallbackPage + 1,
    },
  };
}

export async function getMyTradePosts(
  accessToken: string,
  query: TradePostQuery = {},
  signal?: AbortSignal
): Promise<TradePostsPage> {
  const searchParams = new URLSearchParams();
  if (query.page !== undefined) searchParams.set("page", String(query.page));
  if (query.limit !== undefined) searchParams.set("limit", String(query.limit));
  if (query.category) searchParams.set("category", query.category);
  if (query.search) searchParams.set("search", query.search);
  if (query.sortBy) searchParams.set("sortBy", query.sortBy);
  if (query.sortOrder) searchParams.set("sortOrder", query.sortOrder);
  if (query.status) searchParams.set("status", query.status);
  const queryString = searchParams.toString();

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/trade-posts/me${queryString ? `?${queryString}` : ""}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      }
    );
  } catch {
    throw new TradePostRequestError("Không thể kết nối tới máy chủ.", 0);
  }

  const body = (await response.json().catch(() => undefined)) as
    | ApiEnvelope<TradePostResponse[]>
    | ApiErrorEnvelope
    | undefined;
  if (!response.ok || !body?.success) {
    throw new TradePostRequestError(
      body && !body.success ? body.error.message : "Không thể tải tin của bạn.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }

  const fallbackPage = query.page ?? 1;
  const fallbackLimit = query.limit ?? 20;
  return {
    items: body.data.map(normalizeTradePost),
    meta: body.meta ?? {
      page: fallbackPage,
      limit: fallbackLimit,
      total: body.data.length,
      totalPages: 1,
    },
  };
}

export function getMyTradePostDetail(
  accessToken: string,
  id: string
): Promise<TradePostResponse> {
  return request<TradePostResponse>(
    `/trade-posts/${encodeURIComponent(id)}/manage`,
    accessToken,
    { method: "GET" }
  ).then(normalizeTradePost);
}

export function deleteTradePost(
  accessToken: string,
  id: string
): Promise<void> {
  return request<void>(`/trade-posts/${encodeURIComponent(id)}`, accessToken, {
    method: "DELETE",
  });
}

export function getMyTradeAnalytics(
  accessToken: string,
  range?: { from?: string; to?: string }
): Promise<TradeAnalyticsSummary> {
  const search = new URLSearchParams();
  if (range?.from) search.set("from", range.from);
  if (range?.to) search.set("to", range.to);
  const queryString = search.toString();
  return request<TradeAnalyticsSummary>(
    `/trade-posts/me/analytics${queryString ? `?${queryString}` : ""}`,
    accessToken,
    { method: "GET" }
  ).then((summary) => ({
    ...summary,
    topPosts: summary.topPosts.map((post) => ({
      ...post,
      thumbnailUrl: resolveTradeMediaUrl(post.thumbnailUrl),
    })),
  }));
}

export async function getTradePostDetail(
  slug: string,
  signal?: AbortSignal,
  accessToken?: string | null
): Promise<TradePostResponse> {
  try {
    const post = await publicRequest<TradePostResponse>(
      `/trade-posts/${encodeURIComponent(slug)}`,
      signal,
      accessToken
    );
    return normalizeTradePost(post);
  } catch (error) {
    if (error instanceof TradePostRequestError && error.status === 404) {
      invalidateTradePost(slug);
    }
    throw error;
  }
}

export function saveTradePost(
  accessToken: string,
  idOrSlug: string
): Promise<TradePostSaveResult> {
  return request<TradePostSaveResult>(
    `/trade-posts/${encodeURIComponent(idOrSlug)}/save`,
    accessToken,
    { method: "POST" }
  );
}

export function removeTradePostSave(
  accessToken: string,
  idOrSlug: string
): Promise<void> {
  return request<void>(
    `/trade-posts/${encodeURIComponent(idOrSlug)}/save`,
    accessToken,
    { method: "DELETE" }
  );
}

export async function getSavedTradePosts(
  accessToken: string,
  page = 1,
  limit = 20,
  signal?: AbortSignal
): Promise<{ items: SavedTradePostResponse[]; meta: PaginationMeta }> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/trade-posts/me/saved?page=${page}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      }
    );
  } catch {
    throw new TradePostRequestError("Không thể kết nối tới máy chủ.", 0);
  }

  const body = (await response.json().catch(() => undefined)) as
    | ApiEnvelope<SavedTradePostResponse[]>
    | ApiErrorEnvelope
    | undefined;
  if (!response.ok || !body?.success) {
    throw new TradePostRequestError(
      body && !body.success ? body.error.message : "Không thể tải tin đã lưu.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }

  return {
    items: body.data.filter(isTradePostAvailable).map((post) => normalizeTradePost(post) as SavedTradePostResponse),
    meta: body.meta ?? {
      page,
      limit,
      total: body.data.length,
      totalPages: body.data.length < limit ? page : page + 1,
    },
  };
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

export async function getOwnerTradeReviews(
  accessToken: string,
  page = 1,
  limit = 50
): Promise<{ items: TradeReviewResponse[]; meta: PaginationMeta }> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/trade-management/reviews?page=${page}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch {
    throw new TradePostRequestError("Không thể kết nối tới máy chủ.", 0);
  }

  const body = (await response.json().catch(() => undefined)) as
    | ApiEnvelope<TradeReviewResponse[]>
    | ApiErrorEnvelope
    | undefined;
  if (!response.ok || !body?.success) {
    throw new TradePostRequestError(
      body && !body.success ? body.error.message : "Không thể tải đánh giá.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }
  return {
    items: body.data.map(normalizeTradeReview),
    meta: body.meta ?? { page, limit, total: body.data.length, totalPages: 1 },
  };
}

export function replyToTradeReview(
  accessToken: string,
  reviewId: string,
  content: string
): Promise<TradeReviewResponse> {
  return request<TradeReviewResponse>(
    `/trade-management/reviews/${encodeURIComponent(reviewId)}/reply`,
    accessToken,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  ).then(normalizeTradeReview);
}

export function replyToTradeReviewOwner(
  accessToken: string,
  tradePostId: string,
  reviewId: string,
  content: string
): Promise<TradeReviewCustomerReply> {
  return request<TradeReviewCustomerReply>(
    `/trade-posts/${encodeURIComponent(tradePostId)}/reviews/${encodeURIComponent(reviewId)}/replies`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  ).then(normalizeTradeReviewCustomerReply);
}

export function removeTradeReviewReply(
  accessToken: string,
  reviewId: string
): Promise<TradeReviewResponse> {
  return request<TradeReviewResponse>(
    `/trade-management/reviews/${encodeURIComponent(reviewId)}/reply`,
    accessToken,
    { method: "DELETE" }
  ).then(normalizeTradeReview);
}

export function getTradeConversations(
  accessToken: string
): Promise<TradeConversationResponse[]> {
  return request<TradeConversationResponse[]>(
    "/trade-conversations",
    accessToken,
    { method: "GET" }
  ).then((items) => items.map(normalizeTradeConversation));
}

export function startTradeConversation(
  accessToken: string,
  tradePostId: string,
  message: string
): Promise<TradeConversationResponse> {
  return request<TradeConversationResponse>(
    "/trade-conversations",
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradePostId, message }),
    }
  ).then(normalizeTradeConversation);
}

export async function getTradeMessages(
  accessToken: string,
  conversationId: string,
  page = 1,
  limit = 100
): Promise<{ items: TradeMessageResponse[]; meta: PaginationMeta }> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/trade-conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch {
    throw new TradePostRequestError("Không thể kết nối tới máy chủ.", 0);
  }
  const body = (await response.json().catch(() => undefined)) as
    | ApiEnvelope<TradeMessageResponse[]>
    | ApiErrorEnvelope
    | undefined;
  if (!response.ok || !body?.success) {
    throw new TradePostRequestError(
      body && !body.success ? body.error.message : "Không thể tải tin nhắn.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }
  return {
    items: body.data,
    meta: body.meta ?? { page, limit, total: body.data.length, totalPages: 1 },
  };
}

export function sendTradeMessage(
  accessToken: string,
  conversationId: string,
  content: string
): Promise<TradeMessageResponse> {
  return request<TradeMessageResponse>(
    `/trade-conversations/${encodeURIComponent(conversationId)}/messages`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );
}

export function markTradeConversationRead(
  accessToken: string,
  conversationId: string
): Promise<void> {
  return request<void>(
    `/trade-conversations/${encodeURIComponent(conversationId)}/read`,
    accessToken,
    { method: "PATCH" }
  );
}

export async function recordTradePostInteraction(
  idOrSlug: string,
  type: "CONTACT_PHONE" | "CONTACT_ZALO" | "SHARE"
): Promise<void> {
  try {
    await fetch(
      `${API_BASE_URL}/trade-posts/${encodeURIComponent(idOrSlug)}/interactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      }
    );
  } catch {
    // Analytics must never block the user's primary action.
  }
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
  ).then(normalizeTradeReview);
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
