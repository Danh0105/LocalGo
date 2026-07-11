import {
  CuisineCategory,
  CuisineItem,
  cuisineItems,
} from "@/data/cuisine";

export interface CuisineQuery {
  category?: CuisineCategory;
}

export async function getCuisineItems(
  query: CuisineQuery = {}
): Promise<CuisineItem[]> {
  const { category } = query;

  return category
    ? cuisineItems.filter((item) => item.category === category)
    : cuisineItems;
}

export async function getCuisineItemById(
  id: string
): Promise<CuisineItem | undefined> {
  return cuisineItems.find((item) => item.id === id);
}
