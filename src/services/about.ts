import bgFallback from "@/static/home-hero.jpg";
import dragonBoat from "@/static/dragon-boat.png";
import pottery from "@/static/pottery.png";
import temple from "@/static/temple.png";
import tractor from "@/static/tractor.png";

// Backend doesn't send which local icon a highlight should use (imageUrl is
// usually ""), so fall back to this fixed set by sortOrder to match the
// icons the Mini App has always shown for these four sections.
const HIGHLIGHT_ICON_FALLBACKS = [temple, tractor, pottery, dragonBoat];

export interface AboutStatistic {
  id: string;
  value: string;
  unit: string;
  label: string;
}

export interface AboutHighlight {
  id: string;
  title: string;
  description: string;
  image: string;
}

export interface AboutMilestone {
  id: string;
  year: string;
  text: string;
}

export interface AboutContent {
  title: string;
  heroImage: string;
  overviewTitle: string;
  overviewParagraphs: string[];
  statistics: AboutStatistic[];
  highlightsSectionTitle: string;
  highlights: AboutHighlight[];
  milestonesSectionTitle: string;
  milestones: AboutMilestone[];
}

interface AboutApiResponse {
  id: "about";
  title: string;
  hero: { imageUrl: string; imageAlt: string };
  overview: { title: string; paragraphs: string[] };
  statistics: {
    id: string;
    value: string;
    unit: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
  }[];
  highlightsSectionTitle: string;
  highlights: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    imageAlt: string;
    sortOrder: number;
    isActive: boolean;
  }[];
  milestonesSectionTitle: string;
  milestones: {
    id: string;
    year: string;
    title: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
  }[];
  publishedAt: string | null;
  updatedAt: string;
  version: number;
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

function toAboutContent(item: AboutApiResponse): AboutContent {
  return {
    title: item.title,
    heroImage: item.hero.imageUrl || bgFallback,
    overviewTitle: item.overview.title,
    overviewParagraphs: item.overview.paragraphs,
    statistics: item.statistics
      .filter((stat) => stat.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((stat) => ({
        id: stat.id,
        value: stat.value,
        unit: stat.unit,
        label: stat.label,
      })),
    highlightsSectionTitle: item.highlightsSectionTitle,
    highlights: item.highlights
      .filter((highlight) => highlight.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((highlight, index) => ({
        id: highlight.id,
        title: highlight.title,
        description: highlight.description,
        image:
          highlight.imageUrl ||
          HIGHLIGHT_ICON_FALLBACKS[index % HIGHLIGHT_ICON_FALLBACKS.length],
      })),
    milestonesSectionTitle: item.milestonesSectionTitle,
    milestones: item.milestones
      .filter((milestone) => milestone.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((milestone) => ({
        id: milestone.id,
        year: milestone.year,
        text: milestone.description,
      })),
  };
}

export async function getAbout(signal?: AbortSignal): Promise<AboutContent> {
  const item = await get<AboutApiResponse>("/about", signal);
  return toAboutContent(item);
}
