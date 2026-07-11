import { Festival, FestivalCategory, festivals } from "@/data/festivals";

export interface FestivalQuery {
  category?: FestivalCategory;
}

export async function getFestivals(
  query: FestivalQuery = {}
): Promise<Festival[]> {
  const { category } = query;

  return category
    ? festivals.filter((festival) => festival.category === category)
    : festivals;
}

export async function getFestivalById(
  id: string
): Promise<Festival | undefined> {
  return festivals.find((festival) => festival.id === id);
}
