import {
  AgricultureCategory,
  AgricultureItem,
  agricultureItems,
} from "@/data/agriculture";

export interface AgricultureQuery {
  category?: AgricultureCategory;
}

export async function getAgricultureItems(
  query: AgricultureQuery = {}
): Promise<AgricultureItem[]> {
  const { category } = query;

  return category
    ? agricultureItems.filter((item) => item.category === category)
    : agricultureItems;
}

export async function getAgricultureItemById(
  id: string
): Promise<AgricultureItem | undefined> {
  return agricultureItems.find((item) => item.id === id);
}
