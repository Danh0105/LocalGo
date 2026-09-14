import festivalIcon from "@/static/dragon-boat.png";
import { Festival, FestivalCategory } from "@/data/festivals";

export interface FestivalQuery {
  category?: FestivalCategory;
}

interface FestivalApiItem {
  id: string;
  name: string;
  category: FestivalCategory;
  time: string;
  location: string;
  scale: string;
  summary: string;
  description: string[];
  activities: string[];
  note: string;
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

function toFestival(item: FestivalApiItem): Festival {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    time: item.time,
    location: item.location,
    scale: item.scale,
    summary: item.summary,
    description: item.description,
    activities: item.activities,
    note: item.note,
    image: item.imageUrl ?? festivalIcon,
  };
}

export async function getFestivals(
  query: FestivalQuery = {}
): Promise<Festival[]> {
  const { category } = query;
  const search = category ? `?category=${encodeURIComponent(category)}` : "";
  const items = await get<FestivalApiItem[]>(`/festivals${search}`);
  return items.map(toFestival);
}

export async function getFestivalById(
  id: string,
  signal?: AbortSignal
): Promise<Festival | undefined> {
  try {
    const item = await get<FestivalApiItem>(
      `/festivals/${encodeURIComponent(id)}`,
      signal
    );
    return toFestival(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
