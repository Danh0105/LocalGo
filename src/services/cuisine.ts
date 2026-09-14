import cuisineIcon from "@/static/fried-rice.png";
import { CuisineCategory, CuisineItem } from "@/data/cuisine";

export interface CuisineQuery {
  category?: CuisineCategory;
}

interface CuisineApiItem {
  id: string;
  name: string;
  category: CuisineCategory;
  priceRange: string;
  bestTime: string;
  suggestedPlaces: string[];
  summary: string;
  description: string[];
  highlights: string[];
  tip: string;
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

function toCuisineItem(item: CuisineApiItem): CuisineItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    priceRange: item.priceRange,
    bestTime: item.bestTime,
    suggestedPlaces: item.suggestedPlaces,
    summary: item.summary,
    description: item.description,
    highlights: item.highlights,
    tip: item.tip,
    image: item.imageUrl ?? cuisineIcon,
  };
}

export async function getCuisineItems(
  query: CuisineQuery = {}
): Promise<CuisineItem[]> {
  const { category } = query;
  const search = category ? `?category=${encodeURIComponent(category)}` : "";
  const items = await get<CuisineApiItem[]>(`/cuisine${search}`);
  return items.map(toCuisineItem);
}

export async function getCuisineItemById(
  id: string,
  signal?: AbortSignal
): Promise<CuisineItem | undefined> {
  try {
    const item = await get<CuisineApiItem>(
      `/cuisine/${encodeURIComponent(id)}`,
      signal
    );
    return toCuisineItem(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
