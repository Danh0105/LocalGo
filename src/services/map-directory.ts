
import { attractions } from "@/data/attractions";
import {
  getResolvedMapCoordinates,
} from "@/data/map-location";
import type { MapLocation } from "@/data/map-location";

import { getMapPlaces } from "@/services/map-places";
import { getCuisineItems } from "@/services/cuisine";
import { getTemples } from "@/services/temples";
import { getHistoricalSites } from "@/services/historical-sites";

import { isValidGoogleMapsUrl } from "@/lib/google-maps-link";
import templeIcon from "@/static/map.png";

export type DirectoryCategory =
  | "Du lịch"
  | "Ăn uống"
  | "Đền miếu"
  | "Địa điểm khác";

type Coordinates = [number, number];

export interface DirectoryPlace {
  id: string;
  name: string;
  address: string;
  summary: string;
  image: string;
  categories: DirectoryCategory[];
  googleMapsUrl: string;
  detailPath: string;
  coordinates?: Coordinates;
  mapLocation?: MapLocation | null;
}

type SourcePlace = Omit<DirectoryPlace, "coordinates"> & {
  coordinates?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  lat?: unknown;
  lng?: unknown;
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  return undefined;
}

function validateCoordinates(
  latValue: unknown,
  lngValue: unknown,
): Coordinates | undefined {
  const lat = toNumber(latValue);
  const lng = toNumber(lngValue);

  if (lat === undefined || lng === undefined) {
    return undefined;
  }

  if (
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return undefined;
  }

  return [lat, lng];
}

function normalizeCoordinates(
  value: unknown,
): Coordinates | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    if (value.length !== 2) return undefined;

    return validateCoordinates(value[0], value[1]);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return validateCoordinates(
      record.lat ?? record.latitude,
      record.lng ?? record.longitude,
    );
  }

  return undefined;
}

/**
 * Chỉ trích xuất tọa độ khi URL Google Maps
 * thực sự chứa cặp latitude/longitude.
 *
 * Không gọi mạng.
 * Không đoán tọa độ từ tên hoặc địa chỉ.
 * Không thể giải mã URL rút gọn maps.app.goo.gl.
 */
export function coordinatesFromMapsUrl(
  value: string,
): Coordinates | undefined {
  if (!isValidGoogleMapsUrl(value)) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }

  let pathname: string;

  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }

  // Google Maps: !3dLAT!4dLNG
  const destination = pathname.match(
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  );

  if (destination) {
    return validateCoordinates(
      destination[1],
      destination[2],
    );
  }

  // Google Maps: /@LAT,LNG,15z
  const atCoordinates = pathname.match(
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|\/|$)/,
  );

  if (atCoordinates) {
    return validateCoordinates(
      atCoordinates[1],
      atCoordinates[2],
    );
  }

  // Google Maps: ?q=LAT,LNG
  // hoặc ?query=LAT,LNG
  const query =
    url.searchParams.get("destination") ??
    url.searchParams.get("query") ??
    url.searchParams.get("q") ??
    "";

  const pair = query.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  );

  if (!pair) {
    return undefined;
  }

  return validateCoordinates(pair[1], pair[2]);
}

/**
 * Xác định tọa độ chính xác nhất có sẵn.
 */
function resolvePlaceCoordinates(
  place: SourcePlace,
): Coordinates | undefined {
  // 1. Kết quả Backend phân giải Google Maps.
  const resolved = getResolvedMapCoordinates(
    place.mapLocation,
  );

  const fromResolved = normalizeCoordinates(resolved);

  if (fromResolved) {
    return fromResolved;
  }

  // 2. Dữ liệu coordinates trực tiếp từ API.
  const direct = normalizeCoordinates(
    place.coordinates,
  );

  if (direct) {
    return direct;
  }

  // 3. API trả về latitude / longitude.
  const fromFields = validateCoordinates(
    place.latitude ?? place.lat,
    place.longitude ?? place.lng,
  );

  if (fromFields) {
    return fromFields;
  }

  // 4. URL đầy đủ có tọa độ.
  return coordinatesFromMapsUrl(
    place.googleMapsUrl,
  );
}

/**
 * Gộp địa điểm theo Google Maps URL.
 * Giữ tọa độ hợp lệ nếu một nguồn khác đã có.
 */
export function mergeDirectoryPlaces(
  items: DirectoryPlace[],
): DirectoryPlace[] {
  const unique = new Map<string, DirectoryPlace>();

  for (const item of items) {
    if (!isValidGoogleMapsUrl(item.googleMapsUrl)) {
      continue;
    }

    const googleMapsUrl = item.googleMapsUrl.trim();

    const coordinates = resolvePlaceCoordinates(
      item as SourcePlace,
    );

    const previous = unique.get(googleMapsUrl);

    if (previous) {
      previous.categories = Array.from(
        new Set([
          ...previous.categories,
          ...item.categories,
        ]),
      );

      if (!previous.coordinates && coordinates) {
        previous.coordinates = coordinates;
        previous.mapLocation = item.mapLocation;
      }

      continue;
    }

    unique.set(googleMapsUrl, {
      ...item,
      googleMapsUrl,
      categories: [...item.categories],
      coordinates,
    });
  }

  return [...unique.values()];
}

/**
 * Timeout riêng cho từng nguồn dữ liệu.
 */
async function withSourceTimeout<T>(
  request: Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("MAP_SOURCE_TIMEOUT")),
          15_000,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Tải và chuẩn hóa toàn bộ địa điểm.
 */
export async function getMapDirectory(): Promise<{
  places: DirectoryPlace[];
  failedSources: string[];
}> {
  const sources = [
    "Bản đồ",
    "Ăn uống",
    "Đền miếu",
    "Di tích",
  ];

  const requests: Promise<DirectoryPlace[]>[] = [
    // A. Địa điểm bản đồ.
    getMapPlaces().then((items) =>
      items.map((item) => {
        const source: SourcePlace = {
          ...item,
          id: `map:${item.id}`,
          categories: [
            item.category === "Ẩm thực"
              ? "Ăn uống"
              : item.category === "Du lịch" ||
                  item.category === "Di tích"
                ? "Du lịch"
                : "Địa điểm khác",
          ],
          googleMapsUrl: item.googleMapsUrl ?? "",
          detailPath: `/map/${encodeURIComponent(
            item.id,
          )}`,
        };

        return {
          ...source,
          coordinates: resolvePlaceCoordinates(source),
        } as DirectoryPlace;
      }),
    ),

    // B. Ẩm thực.
    getCuisineItems().then((items) =>
      items.flatMap((item): DirectoryPlace[] => {
        const main: SourcePlace = {
          id: `cuisine:${item.id}`,
          name: item.name,
          address: "",
          summary: item.summary,
          image: item.image,
          categories: ["Ăn uống"],
          googleMapsUrl: item.googleMapsUrl ?? "",
          mapLocation: item.mapLocation ?? null,
          detailPath: `/cuisine/${encodeURIComponent(
            item.id,
          )}`,
        };

        const mainPlace: DirectoryPlace = {
          ...main,
          coordinates: resolvePlaceCoordinates(main),
        };

        const suggested: DirectoryPlace[] = (
          item.suggestedPlaceDetails ?? []
        ).map((place) => {
          const source: SourcePlace = {
            id: `cuisine:${item.id}:${place.id}`,
            name: place.name,
            address: place.address,
            summary: item.name,
            image: item.image,
            categories: ["Ăn uống"],
            googleMapsUrl: place.googleMapsUrl ?? "",
            mapLocation: place.mapLocation ?? null,
            detailPath: `/cuisine/${encodeURIComponent(
              item.id,
            )}`,
          };

          return {
            ...source,
            coordinates: resolvePlaceCoordinates(source),
          };
        });

        return [mainPlace, ...suggested];
      }),
    ),

    // C. Đền miếu.
    getTemples().then((items) =>
      items.map((item) => {
        const source: SourcePlace = {
          ...item,
          id: `temple:${item.id}`,
          image: item.imageUrl ?? templeIcon,
          categories: ["Đền miếu"],
          googleMapsUrl: item.googleMapsUrl ?? "",
          detailPath: `/temples/${encodeURIComponent(
            item.id,
          )}`,
        };

        return {
          ...source,
          coordinates: resolvePlaceCoordinates(source),
        } as DirectoryPlace;
      }),
    ),

    // D. Di tích lịch sử.
    getHistoricalSites().then((items) =>
      items.map((item) => {
        const source: SourcePlace = {
          ...item,
          id: `history:${item.id}`,
          categories: ["Du lịch"],
          googleMapsUrl: item.googleMapsUrl ?? "",
          detailPath: `/historical-sites/${encodeURIComponent(
            item.id,
          )}`,
        };

        return {
          ...source,
          coordinates: resolvePlaceCoordinates(source),
        } as DirectoryPlace;
      }),
    ),
  ];

  const results = await Promise.allSettled(
    requests.map((request) =>
      withSourceTimeout(request),
    ),
  );

  // E. Các địa điểm du lịch lưu local.
  const localAttractions: DirectoryPlace[] =
    attractions.map((item) => {
      const source: SourcePlace = {
        ...item,
        id: `attraction:${item.id}`,
        categories: ["Du lịch"],
        googleMapsUrl: item.googleMapsUrl ?? "",
        detailPath: `/attractions/${encodeURIComponent(
          item.id,
        )}`,
      };

      return {
        ...source,
        coordinates: resolvePlaceCoordinates(source),
      } as DirectoryPlace;
    });

  const allPlaces = [
    ...localAttractions,
    ...results.flatMap((result) =>
      result.status === "fulfilled"
        ? result.value
        : [],
    ),
  ];

  const places = mergeDirectoryPlaces(allPlaces);

  const withCoordinates = places.filter(
    (place) =>
      normalizeCoordinates(place.coordinates) !== undefined,
  );

  const withoutCoordinates = places.filter(
    (place) =>
      normalizeCoordinates(place.coordinates) === undefined,
  );

  console.info("[MapDirectory] Tổng địa điểm:", places.length);
  console.info(
    "[MapDirectory] Có tọa độ:",
    withCoordinates.length,
  );
  console.info(
    "[MapDirectory] Thiếu tọa độ:",
    withoutCoordinates.length,
  );

  if (withoutCoordinates.length > 0) {
    console.table(
      withoutCoordinates.map((place) => ({
        id: place.id,
        name: place.name,
        url: place.googleMapsUrl,
        hasMapLocation: Boolean(place.mapLocation),
      })),
    );
  }

  return {
    places,
    failedSources: results.flatMap((result, index) =>
      result.status === "rejected"
        ? [sources[index]]
        : [],
    ),
  };
}
