import ocopIcon from "@/static/icon-13.png";
import { OcopCategory, OcopProduct, OcopRating } from "@/data/ocop";

export interface OcopQuery {
  category?: OcopCategory;
  rating?: number;
}

interface OcopApiItem {
  id: string;
  name: string;
  category: OcopCategory;
  rating: OcopRating;
  producer: string;
  address: string;
  contactPhone?: string | null;
  googleMapsUrl?: string | null;
  priceRange: string;
  summary: string;
  description: string[];
  highlights: string[];
  contactNote: string;
  imageUrl: string | null;
  imageAlt: string;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.localgo.skilltripx.com.vn/api/v1";

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED");
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}

function toOcopProduct(item: OcopApiItem): OcopProduct {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    rating: item.rating,
    producer: item.producer,
    address: item.address,
    contactPhone: item.contactPhone?.trim() || undefined,
    googleMapsUrl: item.googleMapsUrl ?? null,
    priceRange: item.priceRange,
    summary: item.summary,
    description: item.description,
    highlights: item.highlights,
    contactNote: item.contactNote,
    image: item.imageUrl ?? ocopIcon,
  };
}

export async function getOcopProducts(
  query: OcopQuery = {}
): Promise<OcopProduct[]> {
  const { category, rating } = query;
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (rating) params.set("rating", String(rating));
  const search = params.toString();
  const items = await get<OcopApiItem[]>(
    `/ocop${search ? `?${search}` : ""}`
  );
  return items.map(toOcopProduct);
}

export async function getOcopProductById(
  id: string,
  signal?: AbortSignal
): Promise<OcopProduct | undefined> {
  try {
    const item = await get<OcopApiItem>(
      `/ocop/${encodeURIComponent(id)}`,
      signal
    );
    return toOcopProduct(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
