export type BusinessType = "TEMPLE_MANAGEMENT" | "RESTAURANT" | "ACCOMMODATION" | "GARDEN" | "GENERAL";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  TEMPLE_MANAGEMENT: "Ban quản lý đền/chùa/miếu",
  RESTAURANT: "Nhà hàng/Quán ăn",
  ACCOMMODATION: "Cơ sở lưu trú",
  GARDEN: "Chủ vườn",
  GENERAL: "Cơ sở kinh doanh",
};

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(BUSINESS_TYPE_LABELS, value);
}

export interface BusinessProfile {
  id: string;
  userId: string;
  businessType: BusinessType;
  businessName: string;
  businessCategory: string;
  templeName: string | null;
  openingHours: string | null;
  seatingCapacity: number | null;
  roomCount: number | null;
  gardenArea: string | null;
  mainProducts: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  googleMapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  facebookUrl: string | null;
  zaloOaUrl: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  isPublic: boolean;
  version: number;
  owner: { id: string; displayName: string; avatarUrl: string | null; status: "ACTIVE" | "BLOCKED" | "PENDING" };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type BusinessProfileInput = Pick<BusinessProfile,
  "businessName" | "businessCategory" | "contactName" | "contactPhone" | "contactEmail" | "address" |
  "googleMapsUrl" | "lat" | "lng" | "website" | "facebookUrl" | "zaloOaUrl" |
  "logoUrl" | "coverImageUrl" | "description" | "isPublic"
> & Partial<Pick<BusinessProfile, "templeName" | "openingHours" | "seatingCapacity" | "roomCount" | "gardenArea" | "mainProducts">>;

export interface BusinessProfileQuery {
  businessType?: BusinessType;
  search?: string;
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}
