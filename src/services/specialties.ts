import specialtyIcon from "@/static/restaurant.png";
import { Specialty, SpecialtyCategory } from "@/data/specialties";

export interface SpecialtyQuery {
  category?: SpecialtyCategory;
}

interface SpecialtyApiItem {
  id: string;
  name: string;
  category: SpecialtyCategory;
  price: string;
  season: string;
  summary: string;
  description: string[];
  buyPlaces: string[];
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

function toSpecialty(item: SpecialtyApiItem): Specialty {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    season: item.season,
    summary: item.summary,
    description: item.description,
    buyPlaces: item.buyPlaces,
    image: item.imageUrl ?? specialtyIcon,
  };
}

export async function getSpecialties(
  query: SpecialtyQuery = {},
  signal?: AbortSignal
): Promise<Specialty[]> {
  const { category } = query;
  const search = category ? `?category=${encodeURIComponent(category)}` : "";
  const items = await get<SpecialtyApiItem[]>(`/specialties${search}`, signal);
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
