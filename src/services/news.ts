import newsIcon from "@/static/icon-07.png";
import { NewsArticle, NewsCategory } from "@/data/news";

export interface NewsQuery {
  category?: NewsCategory;
}

interface NewsArticleApiItem {
  id: string;
  googleMapsUrl?: string | null;
  title: string;
  category: NewsCategory;
  publishedAt: string;
  author: string;
  summary: string;
  content: string[];
  tags: string[];
  relatedLinks: string[];
  imageUrl: string | null;
  imageAlt: string;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedApiEnvelope<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface NewsArticlesPage {
  articles: NewsArticle[];
  page: number;
  totalPages: number;
  total: number;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.localgo.skilltripx.com.vn/api/v1";

// news.tsx/news-detail.tsx expect NewsArticle.publishedAt as a ready-to-display
// "dd/mm/yyyy" string (legacy hard-coded data shape); the API now returns ISO
// 8601 datetimes, so formatting happens here to keep the pages unchanged.
function formatPublishedAt(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED");
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}

function toNewsArticle(item: NewsArticleApiItem): NewsArticle {
  return {
    id: item.id,
    googleMapsUrl: item.googleMapsUrl ?? null,
    title: item.title,
    category: item.category,
    publishedAt: formatPublishedAt(item.publishedAt),
    author: item.author,
    summary: item.summary,
    content: item.content,
    tags: item.tags,
    relatedLinks: item.relatedLinks,
    image: item.imageUrl ?? newsIcon,
  };
}

export async function getNewsArticles(
  query: NewsQuery = {}
): Promise<NewsArticle[]> {
  const { category } = query;
  const params = new URLSearchParams({ limit: "100" });
  if (category) params.set("category", category);
  const items = await get<NewsArticleApiItem[]>(`/news?${params.toString()}`);
  return items.map(toNewsArticle);
}

// Backend paginates /news (default 20/page). news.tsx uses this directly to
// drive a "Xem thêm" button instead of getNewsArticles' fixed limit=100 fetch.
export async function getNewsArticlesPage(
  query: NewsQuery = {},
  page = 1,
  signal?: AbortSignal
): Promise<NewsArticlesPage> {
  const { category } = query;
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set("category", category);
  const response = await fetch(`${API_BASE_URL}/news?${params.toString()}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED");
  }
  const body = (await response.json()) as PaginatedApiEnvelope<NewsArticleApiItem>;
  return {
    articles: body.data.map(toNewsArticle),
    page: body.meta.page,
    totalPages: body.meta.totalPages,
    total: body.meta.total,
  };
}

export async function getNewsArticleById(
  id: string,
  signal?: AbortSignal
): Promise<NewsArticle | undefined> {
  try {
    const item = await get<NewsArticleApiItem>(
      `/news/${encodeURIComponent(id)}`,
      signal
    );
    return toNewsArticle(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}
