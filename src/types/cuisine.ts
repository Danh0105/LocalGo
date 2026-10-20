/**
 * Types dùng cho Mini App (public API), độc lập với DTO quản trị.
 * Các trường chỉ có ở endpoint detail được mặc định [] / '' trong list
 * để vẫn giữ cấu trúc CuisineItem cho các component cũ.
 */
export const CUISINE_CATEGORIES = [
  'Món nước',
  'Món nướng',
  'Món cuốn',
  'Ăn vặt',
  'Món chay',
] as const;

export type CuisineCategory = (typeof CUISINE_CATEGORIES)[number];

export interface CuisineSuggestedPlace {
  id: string;
  name: string;
  address: string;
  /** URL chính xác do Admin nhập, không tự suy ra từ tên quán. */
  googleMapsUrl: string;
}

export interface CuisineMenuItem {
  id: string;
  name: string;
  price: string;
  description: string;
}

/** Review hiển thị do Admin quản lý, không phải đánh giá realtime của người dùng. */
export interface CuisineReview {
  id: string;
  reviewerName: string;
  rating: number;
  feedback: string;
  adminResponse: string;
}

export interface CuisineGalleryImage {
  mediaId: string;
  imageUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
}

export interface CuisineItem {
  id: string;
  name: string;
  category: CuisineCategory;
  priceRange: string;
  bestTime: string;
  googleMapsUrl: string | null;
  summary: string;
  description: string[];
  highlights: string[];
  tip: string;
  /** Giữ tên `image` để tương thích các thẻ danh sách cũ. */
  image: string;
  imageAlt: string;
  suggestedPlaces: string[];
  suggestedPlaceDetails: CuisineSuggestedPlace[];
  contactPhone: string;
  menu: CuisineMenuItem[];
  reviews: CuisineReview[];
  galleryImages: CuisineGalleryImage[];
  /** Hai số liệu do backend tính từ reviews. */
  averageRating: number;
  reviewCount: number;
}

export interface CuisineQuery {
  category?: CuisineCategory;
}

/** DTO từ GET /api/v1/cuisine; API không bắt buộc trả các trường detail. */
export interface CuisineApiListItem {
  id: string;
  name: string;
  category: CuisineCategory;
  priceRange: string;
  bestTime: string;
  googleMapsUrl?: string | null;
  suggestedPlaces?: string[] | null;
  suggestedPlaceDetails?: CuisineSuggestedPlace[] | null;
  summary: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
}

/** DTO từ GET /api/v1/cuisine/:id. */
export interface CuisineApiDetailItem extends CuisineApiListItem {
  description?: string[] | null;
  highlights?: string[] | null;
  tip?: string | null;
  contactPhone?: string | null;
  menu?: CuisineMenuItem[] | null;
  reviews?: CuisineReview[] | null;
  galleryImages?: CuisineGalleryImage[] | null;
}
