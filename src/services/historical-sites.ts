import historicalIcon from "@/static/icon-12.png";
import { HistoricalSite, HistoricalSiteRank } from "@/data/historical-sites";

export interface HistoricalSiteQuery {
  rank?: HistoricalSiteRank;
}

interface HistoricalSiteApiItem {
  id: string;
  name: string;
  rank: HistoricalSiteRank;
  address: string;
  recognizedYear: number | null;
  googleMapsUrl?: string | null;
  summary: string;
  history: string[];
  highlights: string[];
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

function toHistoricalSite(item: HistoricalSiteApiItem): HistoricalSite {
  return {
    id: item.id,
    name: item.name,
    rank: item.rank,
    address: item.address,
    recognizedYear: item.recognizedYear ?? undefined,
    googleMapsUrl: item.googleMapsUrl ?? null,
    summary: item.summary,
    history: item.history,
    highlights: item.highlights,
    image: item.imageUrl ?? historicalIcon,
  };
}

export async function getHistoricalSites(
  query: HistoricalSiteQuery = {}
): Promise<HistoricalSite[]> {
  const { rank } = query;
  const search = rank ? `?rank=${encodeURIComponent(rank)}` : "";
  const items = await get<HistoricalSiteApiItem[]>(
    `/historical-sites${search}`
  );
  return items.map(toHistoricalSite);
}

export async function getHistoricalSiteById(
  id: string,
  signal?: AbortSignal
): Promise<HistoricalSite | undefined> {
  try {
    const item = await get<HistoricalSiteApiItem>(
      `/historical-sites/${encodeURIComponent(id)}`,
      signal
    );
    return toHistoricalSite(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
