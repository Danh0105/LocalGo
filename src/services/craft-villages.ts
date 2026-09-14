import craftIcon from "@/static/pottery.png";
import { CraftVillage, CraftVillageCategory } from "@/data/craft-villages";

export interface CraftVillageQuery {
  category?: CraftVillageCategory;
}

interface CraftVillageApiItem {
  id: string;
  name: string;
  category: CraftVillageCategory;
  address: string;
  workingTime: string;
  mainProducts: string;
  summary: string;
  description: string[];
  highlights: string[];
  visitorNote: string;
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

function toCraftVillage(item: CraftVillageApiItem): CraftVillage {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    address: item.address,
    workingTime: item.workingTime,
    mainProducts: item.mainProducts,
    summary: item.summary,
    description: item.description,
    highlights: item.highlights,
    visitorNote: item.visitorNote,
    image: item.imageUrl ?? craftIcon,
  };
}

export async function getCraftVillages(
  query: CraftVillageQuery = {}
): Promise<CraftVillage[]> {
  const { category } = query;
  const search = category ? `?category=${encodeURIComponent(category)}` : "";
  const items = await get<CraftVillageApiItem[]>(
    `/craft-villages${search}`
  );
  return items.map(toCraftVillage);
}

export async function getCraftVillageById(
  id: string,
  signal?: AbortSignal
): Promise<CraftVillage | undefined> {
  try {
    const item = await get<CraftVillageApiItem>(
      `/craft-villages/${encodeURIComponent(id)}`,
      signal
    );
    return toCraftVillage(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
