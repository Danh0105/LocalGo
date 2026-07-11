import {
  ExperienceTour,
  ExperienceTourCategory,
  experienceTours,
} from "@/data/experience-tours";

export interface ExperienceTourQuery {
  category?: ExperienceTourCategory;
}

export async function getExperienceTours(
  query: ExperienceTourQuery = {}
): Promise<ExperienceTour[]> {
  const { category } = query;

  return category
    ? experienceTours.filter((tour) => tour.category === category)
    : experienceTours;
}

export async function getExperienceTourById(
  id: string
): Promise<ExperienceTour | undefined> {
  return experienceTours.find((tour) => tour.id === id);
}
