import tourIcon from "@/static/world-tour.png";
import {
  ExperienceTour,
  ExperienceTourCategory,
} from "@/data/experience-tours";

export interface ExperienceTourQuery {
  category?: ExperienceTourCategory;
}

interface ExperienceTourApiItem {
  id: string;
  name: string;
  category: ExperienceTourCategory;
  duration: string;
  startTime: string;
  priceRange: string;
  meetingPoint: string;
  contactPhone?: string | null;
  googleMapsUrl?: string | null;
  summary: string;
  description: string[];
  itinerary: string[];
  included: string[];
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

function toExperienceTour(item: ExperienceTourApiItem): ExperienceTour {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    duration: item.duration,
    startTime: item.startTime,
    priceRange: item.priceRange,
    meetingPoint: item.meetingPoint,
    contactPhone: item.contactPhone?.trim() || undefined,
    googleMapsUrl: item.googleMapsUrl ?? null,
    summary: item.summary,
    description: item.description,
    itinerary: item.itinerary,
    included: item.included,
    note: item.note,
    image: item.imageUrl ?? tourIcon,
  };
}

export async function getExperienceTours(
  query: ExperienceTourQuery = {}
): Promise<ExperienceTour[]> {
  const { category } = query;
  const search = category ? `?category=${encodeURIComponent(category)}` : "";
  const items = await get<ExperienceTourApiItem[]>(
    `/experience-tours${search}`
  );
  return items.map(toExperienceTour);
}

export async function getExperienceTourById(
  id: string,
  signal?: AbortSignal
): Promise<ExperienceTour | undefined> {
  try {
    const item = await get<ExperienceTourApiItem>(
      `/experience-tours/${encodeURIComponent(id)}`,
      signal
    );
    return toExperienceTour(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
