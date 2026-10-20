import cuisineIcon from '@/static/fried-rice.png';
import type {
  CuisineApiDetailItem,
  CuisineApiListItem,
  CuisineItem,
  CuisineQuery,
  CuisineSuggestedPlace,
} from '@/types/cuisine';

export type { CuisineQuery } from '@/types/cuisine';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

export class CuisineApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = 'CuisineApiError';
  }
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'https://api.localgo.skilltripx.com.vn/api/v1'
).replace(/\/$/, '');

export { getSafeCuisineMapsUrl } from './cuisine-maps';

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    signal,
    headers: { Accept: 'application/json' },
    // Cho phép trình duyệt/WebView dùng Cache-Control + ETag từ backend.
    cache: 'default',
  });

  if (!response.ok) {
    let code = response.status === 404
      ? 'CUISINE_ITEM_NOT_FOUND'
      : 'REQUEST_FAILED';
    try {
      const body = (await response.json()) as ApiEnvelope<unknown>;
      code = body.error?.code ?? code;
    } catch {
      // Không có JSON hợp lệ: vẫn dùng HTTP status.
    }
    throw new CuisineApiError(response.status, code);
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  if (!body || body.success !== true || body.data === undefined) {
    throw new CuisineApiError(response.status, 'INVALID_API_RESPONSE');
  }
  return body.data;
}

function toSuggestedPlaceDetails(item: CuisineApiListItem): CuisineSuggestedPlace[] {
  // API mới trả danh sách object; dữ liệu/record cũ có thể chỉ có string[].
  if (Array.isArray(item.suggestedPlaceDetails)) {
    return item.suggestedPlaceDetails.map((place, index) => ({
      id: place.id || `place-${index + 1}`,
      name: place.name || '',
      address: place.address ?? '',
      googleMapsUrl: place.googleMapsUrl ?? '',
    }));
  }
  return (item.suggestedPlaces ?? []).map((name, index) => ({
    id: `legacy-${index + 1}`,
    name,
    address: '',
    googleMapsUrl: '',
  }));
}

function toCuisineItem(item: CuisineApiDetailItem): CuisineItem {
  const suggestedPlaceDetails = toSuggestedPlaceDetails(item);
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    priceRange: item.priceRange,
    bestTime: item.bestTime,
    googleMapsUrl: item.googleMapsUrl ?? null,
    summary: item.summary,
    description: item.description ?? [],
    highlights: item.highlights ?? [],
    tip: item.tip ?? '',
    image: item.imageUrl || cuisineIcon,
    imageAlt: item.imageAlt || item.name,
    suggestedPlaces: suggestedPlaceDetails.map((place) => place.name),
    suggestedPlaceDetails,
    contactPhone: item.contactPhone ?? '',
    menu: item.menu ?? [],
    reviews: item.reviews ?? [],
    galleryImages: [...(item.galleryImages ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    ),
    // Chính backend tính hai giá trị này, không tự tính đè ở client.
    averageRating: item.averageRating ?? 0,
    reviewCount: item.reviewCount ?? 0,
  };
}

/** GET /api/v1/cuisine?category=... (public, chỉ active). */
export async function getCuisineItems(
  query: CuisineQuery = {},
  signal?: AbortSignal,
): Promise<CuisineItem[]> {
  const search = query.category
    ? `?category=${encodeURIComponent(query.category)}`
    : '';
  const items = await get<CuisineApiListItem[]>(`/cuisine${search}`, signal);
  return items.map(toCuisineItem);
}

/**
 * GET /api/v1/cuisine/:id.
 * 404 (không tồn tại hoặc đang ẩn) => undefined.
 * Lỗi kết nối/server sẽ throw để UI hiển thị nút thử lại.
 */
export async function getCuisineItemById(
  id: string,
  signal?: AbortSignal,
): Promise<CuisineItem | undefined> {
  try {
    const item = await get<CuisineApiDetailItem>(
      `/cuisine/${encodeURIComponent(id)}`,
      signal,
    );
    return toCuisineItem(item);
  } catch (error) {
    if (error instanceof CuisineApiError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}
