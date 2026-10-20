import { ContentImageFields, mapContentImages } from "@/data/content-images";
import agricultureIcon from "@/static/tractor.png";
import { AgricultureCategory, AgricultureItem } from "@/data/agriculture";

export interface AgricultureQuery {
  category?: AgricultureCategory;
}

interface AgricultureApiItem extends ContentImageFields {
  id: string;
  name: string;
  category: AgricultureCategory;
  location: string;
  season: string;
  scale: string;
  googleMapsUrl?: string | null;
  summary: string;
  description: string[];
  highlights: string[];
  support: string;
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

function toAgricultureItem(item: AgricultureApiItem): AgricultureItem {
  return {
    ...mapContentImages(item),
    id: item.id,
    name: item.name,
    category: item.category,
    location: item.location,
    season: item.season,
    scale: item.scale,
    googleMapsUrl: item.googleMapsUrl ?? null,
    summary: item.summary,
    description: item.description,
    highlights: item.highlights,
    support: item.support,
    image: item.imageUrl ?? agricultureIcon,
  };
}

export async function getAgricultureItems(
  query: AgricultureQuery = {}
): Promise<AgricultureItem[]> {
  const { category } = query;
  const search = category ? `?category=${encodeURIComponent(category)}` : "";
  const items = await get<AgricultureApiItem[]>(`/agriculture${search}`);
  return items.map(toAgricultureItem);
}

export async function getAgricultureItemById(
  id: string,
  signal?: AbortSignal
): Promise<AgricultureItem | undefined> {
  try {
    const item = await get<AgricultureApiItem>(
      `/agriculture/${encodeURIComponent(id)}`,
      signal
    );
    return toAgricultureItem(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
