import {
  CraftVillage,
  CraftVillageCategory,
  craftVillages,
} from "@/data/craft-villages";

export interface CraftVillageQuery {
  category?: CraftVillageCategory;
}

export async function getCraftVillages(
  query: CraftVillageQuery = {}
): Promise<CraftVillage[]> {
  const { category } = query;

  return category
    ? craftVillages.filter((village) => village.category === category)
    : craftVillages;
}

export async function getCraftVillageById(
  id: string
): Promise<CraftVillage | undefined> {
  return craftVillages.find((village) => village.id === id);
}
