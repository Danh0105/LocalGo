import { getTemples, type TempleListItem } from "@/services/temples";
import { getHistoricalSites } from "@/services/historical-sites";
import type { HistoricalSite } from "@/data/historical-sites";
import { isValidGoogleMapsUrl } from "@/lib/google-maps-link";

export interface HeritageSource {
  type: "temples" | "historical-sites";
  id: string;
  detailPath: string;
}

export interface HeritagePlace {
  key: string;
  name: string;
  address: string;
  summary: string;
  image?: string | null;
  imageAlt: string;
  googleMapsUrl?: string | null;
  tags: string[];
  sources: HeritageSource[];
}

const normalize = (value: string) => value.trim().normalize("NFC").toLocaleLowerCase("vi-VN").replace(/\s+/g, " ");

export function mergeHeritagePlaces(temples: TempleListItem[], sites: HistoricalSite[]): HeritagePlace[] {
  const items: HeritagePlace[] = [
    ...temples.map((item): HeritagePlace => ({
      key: `temples:${item.id}`, name: item.name, address: item.address,
      summary: item.summary, image: item.imageUrl, imageAlt: item.imageAlt,
      googleMapsUrl: item.googleMapsUrl, tags: [item.type],
      sources: [{ type: "temples", id: item.id, detailPath: `/temples/${encodeURIComponent(item.id)}` }],
    })),
    ...sites.map((item): HeritagePlace => ({
      key: `historical-sites:${item.id}`, name: item.name, address: item.address,
      summary: item.summary, image: item.image, imageAlt: item.name,
      googleMapsUrl: item.googleMapsUrl, tags: ["Di tích lịch sử", item.rank],
      sources: [{ type: "historical-sites", id: item.id, detailPath: `/historical-sites/${encodeURIComponent(item.id)}` }],
    })),
  ];
  const places: HeritagePlace[] = [];
  for (const item of items) {
    // Only merge records across the two sources when their identity agrees.
    const previous = places.find((place) =>
      !place.sources.some((source) => source.type === item.sources[0].type) && (
        (Boolean(item.googleMapsUrl) && isValidGoogleMapsUrl(item.googleMapsUrl!) &&
          item.googleMapsUrl!.trim() === place.googleMapsUrl?.trim()) ||
        (Boolean(item.name?.trim()) && Boolean(item.address?.trim()) &&
          normalize(item.name) === normalize(place.name) && normalize(item.address) === normalize(place.address))
      )
    );
    if (previous) {
      previous.tags = [...new Set([...previous.tags, ...item.tags])];
      previous.sources.push(...item.sources);
      previous.image ||= item.image;
      previous.summary ||= item.summary;
    } else {
      places.push(item);
    }
  }
  return places;
}

export async function getHeritageDirectory(signal?: AbortSignal) {
  const results = await Promise.allSettled([
    getTemples(undefined, signal),
    getHistoricalSites({}, signal),
  ]);
  const [temples, sites] = results;
  return {
    places: mergeHeritagePlaces(
      temples.status === "fulfilled" ? temples.value : [],
      sites.status === "fulfilled" ? sites.value : [],
    ),
    failedSources: results.flatMap((result, index) => result.status === "rejected"
      ? [index === 0 ? "Đền - chùa - miếu" : "Di tích lịch sử"] : []),
  };
}
