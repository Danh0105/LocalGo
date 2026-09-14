import mapIcon from "@/static/map.png";
import { MapPlace, MapPlaceCategory } from "@/data/map-places";

export interface MapPlaceQuery {
  category?: MapPlaceCategory;
}

interface MapPlaceApiItem {
  id: string;
  name: string;
  category: MapPlaceCategory;
  address: string;
  coordinates: { lat: number; lng: number };
  openTime: string;
  distanceFromCenter: string;
  summary: string;
  description: string[];
  highlights: string[];
  directionNote: string;
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

function toMapPlace(item: MapPlaceApiItem): MapPlace {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    address: item.address,
    coordinates: item.coordinates,
    openTime: item.openTime,
    distanceFromCenter: item.distanceFromCenter,
    summary: item.summary,
    description: item.description,
    highlights: item.highlights,
    directionNote: item.directionNote,
    image: item.imageUrl ?? mapIcon,
  };
}

export async function getMapPlaces(
  query: MapPlaceQuery = {}
): Promise<MapPlace[]> {
  const { category } = query;
  const search = category ? `?category=${encodeURIComponent(category)}` : "";
  const items = await get<MapPlaceApiItem[]>(`/map-places${search}`);
  return items.map(toMapPlace);
}

export async function getMapPlaceById(
  id: string,
  signal?: AbortSignal
): Promise<MapPlace | undefined> {
  try {
    const item = await get<MapPlaceApiItem>(
      `/map-places/${encodeURIComponent(id)}`,
      signal
    );
    return toMapPlace(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
