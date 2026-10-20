import type { MapLocation } from "@/data/map-location";

export type TempleType = "Đình" | "Chùa" | "Miếu";

export interface TempleListItem {
  id: string;
  name: string;
  type: TempleType;
  address: string;
  openHours: string;
  googleMapsUrl?: string | null;
  mapLocation?: MapLocation | null;
  summary: string;
  imageUrl: string | null;
  imageAlt: string;
  sortOrder: number;
  updatedAt: string;
}

export interface TempleDetail extends TempleListItem {
  description: string[];
  events: Array<{ id: string; time: string; name: string }>;
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

export function getTemples(
  type?: TempleType,
  signal?: AbortSignal
): Promise<TempleListItem[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  return get<TempleListItem[]>(`/temples${query}`, signal);
}

export function getTempleById(
  id: string,
  signal?: AbortSignal
): Promise<TempleDetail> {
  return get<TempleDetail>(`/temples/${encodeURIComponent(id)}`, signal);
}
