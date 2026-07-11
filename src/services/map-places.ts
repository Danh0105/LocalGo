import {
  MapPlace,
  MapPlaceCategory,
  mapPlaces,
} from "@/data/map-places";

export interface MapPlaceQuery {
  category?: MapPlaceCategory;
}

export async function getMapPlaces(
  query: MapPlaceQuery = {}
): Promise<MapPlace[]> {
  const { category } = query;

  return category
    ? mapPlaces.filter((place) => place.category === category)
    : mapPlaces;
}

export async function getMapPlaceById(
  id: string
): Promise<MapPlace | undefined> {
  return mapPlaces.find((place) => place.id === id);
}
