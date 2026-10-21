export type SearchResourceType =
  | "ABOUT"
  | "TEMPLE"
  | "SPECIALTY"
  | "HISTORICAL_SITE"
  | "AGRICULTURE"
  | "OCOP"
  | "CRAFT_VILLAGE"
  | "CUISINE"
  | "FESTIVAL"
  | "EXPERIENCE_TOUR"
  | "FEEDBACK_CHANNEL"
  | "MAP_PLACE"
  | "CONTACT"
  | "NEWS"
  | "TRADE_POST";

export interface SearchResult {
  resourceType: SearchResourceType;
  resourceLabel: string;
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  category: string | null;
  imageUrl: string | null;
  status: string;
  updatedAt: string;
}
