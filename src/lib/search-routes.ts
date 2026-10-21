import type { SearchResourceType, SearchResult } from "@/types/search";

const paths: Record<SearchResourceType, string> = {
  ABOUT: "/about",
  TEMPLE: "/temples",
  SPECIALTY: "/specialties",
  HISTORICAL_SITE: "/historical-sites",
  AGRICULTURE: "/agriculture",
  OCOP: "/ocop",
  CRAFT_VILLAGE: "/craft-villages",
  CUISINE: "/cuisine",
  FESTIVAL: "/festivals",
  EXPERIENCE_TOUR: "/experience-tours",
  FEEDBACK_CHANNEL: "/feedback",
  MAP_PLACE: "/map",
  CONTACT: "/contacts",
  NEWS: "/news",
  TRADE_POST: "/trade",
};

export function getSearchResultPath(item: SearchResult): string {
  const base = paths[item.resourceType];
  if (item.resourceType === "ABOUT") return base;
  if (item.resourceType === "TRADE_POST") {
    return item.slug ? `${base}/${encodeURIComponent(item.slug)}` : base;
  }
  return `${base}/${encodeURIComponent(item.slug || item.id)}`;
}
