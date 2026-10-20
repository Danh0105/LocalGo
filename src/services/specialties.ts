import { ContentImageFields, mapContentImages } from "@/data/content-images";
import specialtyIcon from "@/static/restaurant.png";
import type {
  Specialty,
  SpecialtyBuyPlace,
  SpecialtyCategory,
} from "@/data/specialties";

export interface SpecialtyQuery {
  category?: SpecialtyCategory;
}

/**
 * GET /specialties: endpoint danh sách có thể chỉ trả thông tin tóm tắt.
 * GET /specialties/:id: endpoint chi tiết trả description, buyPlaces, buyPlaceDetails.
 */
interface SpecialtyApiItem {
  id: string;
  name: string;
  category: SpecialtyCategory;
  price: string;
  season: string;
  googleMapsUrl?: string | null;
  summary: string;
  description?: string[];
  buyPlaces?: string[]; // legacy từ Backend
  buyPlaceDetails?: SpecialtyBuyPlace[]; // JSON object hiện tại
  imageUrl: string | null;
  imageAlt: string;
}

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error?: { code?: string; message?: string } };

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  "https://api.localgo.skilltripx.com.vn/api/v1"
).replace(/\/+$/, "");

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });

  if (!response.ok) {
    throw new Error(response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED");
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  if (!body || body.success !== true) {
    throw new Error("REQUEST_FAILED");
  }

  return body.data;
}

/**
 * Ưu tiên JSON object từ buyPlaceDetails.
 * Trường hợp bản ghi cũ chỉ có buyPlaces: string[], dựng object tạm
 * để trang chi tiết vẫn hiển thị mà không mất tên địa điểm.
 */
function normalizeBuyPlaceDetails(
  item: SpecialtyApiItem
): SpecialtyBuyPlace[] {
  const details = Array.isArray(item.buyPlaceDetails)
    ? item.buyPlaceDetails
    : [];

  if (details.length > 0) {
    return details
      .filter((place) => !!place && typeof place.name === "string")
      .map((place, index) => ({
        id: place.id?.trim() || `place-${index}`,
        name: place.name.trim(),
        address: place.address?.trim() ?? "",
        googleMapsUrl: place.googleMapsUrl?.trim() ?? "",
        phone: place.phone?.trim() ?? "",
        email: place.email?.trim() ?? "",
      }))
      .filter((place) => place.name.length > 0);
  }

  const legacyNames = Array.isArray(item.buyPlaces) ? item.buyPlaces : [];
  return legacyNames
    .filter((name): name is string => typeof name === "string")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `legacy-${index}`,
      name,
      address: "",
      googleMapsUrl: "",
      phone: "",
      email: "",
    }));
}

function toSpecialty(item: SpecialtyApiItem): Specialty {
  const buyPlaceDetails = normalizeBuyPlaceDetails(item);

  return {
    ...mapContentImages(item),
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    season: item.season,
    googleMapsUrl: item.googleMapsUrl?.trim() || null,
    summary: item.summary,
    description: Array.isArray(item.description) ? item.description : [],
    // Giữ kiểu chuỗi cho những giao diện Mini App cũ còn sử dụng buyPlaces.
    buyPlaces: buyPlaceDetails.map((place) => place.name),
    // Dữ liệu mới đầy đủ 6 trường cho trang chi tiết.
    buyPlaceDetails,
    image: item.imageUrl || specialtyIcon,
  };
}

export async function getSpecialties(
  query: SpecialtyQuery = {},
  signal?: AbortSignal
): Promise<Specialty[]> {
  const { category } = query;
  const search = category
    ? `?category=${encodeURIComponent(category)}`
    : "";

  const items = await get<SpecialtyApiItem[]>(
    `/specialties${search}`,
    signal
  );
  return items.map(toSpecialty);
}

export async function getSpecialtyById(
  id: string,
  signal?: AbortSignal
): Promise<Specialty | undefined> {
  try {
    const item = await get<SpecialtyApiItem>(
      `/specialties/${encodeURIComponent(id)}`,
      signal
    );
    return toSpecialty(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
