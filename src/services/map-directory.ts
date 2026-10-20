import { attractions } from "@/data/attractions";
import { getResolvedMapCoordinates } from "@/data/map-location";
import type { MapLocation } from "@/data/map-location";
import { getMapPlaces } from "@/services/map-places";
import { getCuisineItems } from "@/services/cuisine";
import { getTemples } from "@/services/temples";
import { getHistoricalSites } from "@/services/historical-sites";
import { isValidGoogleMapsUrl } from "@/lib/google-maps-link";
import templeIcon from "@/static/map.png";

export type DirectoryCategory = "Du lịch" | "Ăn uống" | "Đền miếu" | "Địa điểm khác";
export interface DirectoryPlace {
  id: string;
  name: string;
  address: string;
  summary: string;
  image: string;
  categories: DirectoryCategory[];
  googleMapsUrl: string;
  detailPath: string;
  coordinates?: [number, number];
  mapLocation?: MapLocation | null;
}

// Legacy URL utility; map markers exclusively use getResolvedMapCoordinates.
export function coordinatesFromMapsUrl(value: string): [number, number] | undefined {
  if (!isValidGoogleMapsUrl(value)) return undefined;
  const url = new URL(value.trim());
  let text: string;
  try { text = decodeURIComponent(url.pathname); } catch { return undefined; }
  const destination = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const query = url.searchParams.get("destination") ?? url.searchParams.get("query") ?? url.searchParams.get("q") ?? "";
  const pair = destination?.slice(1) ?? query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)?.slice(1);
  if (!pair) return undefined;
  const lat = Number(pair[0]);
  const lng = Number(pair[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? [lat, lng] : undefined;
}

export function mergeDirectoryPlaces(items: DirectoryPlace[]): DirectoryPlace[] {
  const unique = new Map<string, DirectoryPlace>();
  for (const item of items) {
    if (!isValidGoogleMapsUrl(item.googleMapsUrl)) continue;
    const googleMapsUrl = item.googleMapsUrl.trim();
    const previous = unique.get(googleMapsUrl);
    const coordinates = getResolvedMapCoordinates(item.mapLocation);
    if (previous) {
      previous.categories = Array.from(new Set([...previous.categories, ...item.categories]));
      if (!previous.coordinates && coordinates) {
        previous.coordinates = coordinates;
        previous.mapLocation = item.mapLocation;
      }
    } else {
      unique.set(googleMapsUrl, { ...item, googleMapsUrl, categories: [...item.categories], coordinates });
    }
  }
  return [...unique.values()];
}

async function withSourceTimeout<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("MAP_SOURCE_TIMEOUT")), 15000);
    })]);
  } finally { clearTimeout(timer); }
}

export async function getMapDirectory(): Promise<{ places: DirectoryPlace[]; failedSources: string[] }> {
  const sources = ["Bản đồ", "Ăn uống", "Đền miếu", "Di tích"];
  const requests: Promise<DirectoryPlace[]>[] = [
    getMapPlaces().then(items => items.map(item => ({
      ...item, id: `map:${item.id}`, categories: [item.category === "Ẩm thực" ? "Ăn uống" : item.category === "Du lịch" || item.category === "Di tích" ? "Du lịch" : "Địa điểm khác"] as DirectoryCategory[],
      coordinates: undefined, googleMapsUrl: item.googleMapsUrl ?? "", detailPath: `/map/${encodeURIComponent(item.id)}`,
    }))),
    getCuisineItems().then(items => items.flatMap(item => [
      { id: `cuisine:${item.id}`, name: item.name, address: "", summary: item.summary, image: item.image, categories: ["Ăn uống"] as DirectoryCategory[], googleMapsUrl: item.googleMapsUrl ?? "", mapLocation: item.mapLocation ?? null, detailPath: `/cuisine/${encodeURIComponent(item.id)}` },
      ...(item.suggestedPlaceDetails ?? []).map(place => ({ id: `cuisine:${item.id}:${place.id}`, name: place.name, address: place.address, summary: item.name, image: item.image, categories: ["Ăn uống"] as DirectoryCategory[], googleMapsUrl: place.googleMapsUrl ?? "", mapLocation: place.mapLocation ?? null, detailPath: `/cuisine/${encodeURIComponent(item.id)}` })),
    ])),
    getTemples().then(items => items.map(item => ({ ...item, id: `temple:${item.id}`, image: item.imageUrl ?? templeIcon, categories: ["Đền miếu"] as DirectoryCategory[], googleMapsUrl: item.googleMapsUrl ?? "", detailPath: `/temples/${encodeURIComponent(item.id)}` }))),
    getHistoricalSites().then(items => items.map(item => ({ ...item, id: `history:${item.id}`, categories: ["Du lịch"] as DirectoryCategory[], googleMapsUrl: item.googleMapsUrl ?? "", detailPath: `/historical-sites/${encodeURIComponent(item.id)}` }))),
  ];
  const results = await Promise.allSettled(requests.map(request => withSourceTimeout(request)));
  const localAttractions = attractions.map(item => ({ ...item, id: `attraction:${item.id}`, categories: ["Du lịch"] as DirectoryCategory[], googleMapsUrl: item.googleMapsUrl ?? "", detailPath: `/attractions/${encodeURIComponent(item.id)}` }));
  return {
    places: mergeDirectoryPlaces([...localAttractions, ...results.flatMap(result => result.status === "fulfilled" ? result.value : [])]),
    failedSources: results.flatMap((result, index) => result.status === "rejected" ? [sources[index]] : []),
  };
}
