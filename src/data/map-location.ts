export type MapLocationStatus = "pending" | "resolved" | "unresolved" | "failed";

export interface MapLocation {
  status: MapLocationStatus;
  coordinates: { lat: number; lng: number } | null;
  resolvedAt: string | null;
}

export function getResolvedMapCoordinates(
  location: MapLocation | null | undefined
): [number, number] | undefined {
  if (location?.status !== "resolved" || !location.coordinates) return undefined;
  const { lat, lng } = location.coordinates;
  if (typeof lat !== "number" || typeof lng !== "number"
    || !Number.isFinite(lat) || !Number.isFinite(lng)
    || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return [lat, lng];
}
