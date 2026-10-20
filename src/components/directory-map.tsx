import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { DirectoryPlace } from "@/services/map-directory";
import { getResolvedMapCoordinates } from "@/data/map-location";

type Coordinates = [number, number];

interface Props {
  places: DirectoryPlace[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onPickLocation?: (coordinates: Coordinates) => void;
}

const DEFAULT_CENTER: Coordinates = [11.2418, 106.2024];
const DEFAULT_ZOOM = 12;

const TILE_SOURCES = [
  {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
  },
  {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Tiles &copy; <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noopener noreferrer">Esri</a>, Maxar, Earthstar Geographics, GIS User Community',
  },
] as const;

function normalizeCoordinates(value: unknown): Coordinates | undefined {
  let latitude: unknown;
  let longitude: unknown;

  if (Array.isArray(value) && value.length === 2) {
    [latitude, longitude] = value;
  } else if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;

    latitude = object.lat ?? object.latitude;
    longitude = object.lng ?? object.longitude;
  } else {
    return undefined;
  }

  const toNumber = (input: unknown): number => {
    if (typeof input === "number") return input;

    if (typeof input === "string" && input.trim()) {
      return Number(input);
    }

    return NaN;
  };

  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return undefined;
  }

  return [lat, lng];
}

function getPlaceCoordinates(place: DirectoryPlace): Coordinates | undefined {
  return (
    normalizeCoordinates(place.coordinates) ??
    getResolvedMapCoordinates(place.mapLocation)
  );
}

function createMarkerIcon(selected = false): L.DivIcon {
  const color = selected ? "#dc2626" : "#2563eb";

  return L.divIcon({
    className: "directory-map-marker",
    html: `
      <span style="
        display:block;
        width:24px;
        height:24px;
        background:${color};
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 10px rgba(0,0,0,.3);
      "></span>
    `,
    iconSize: [30, 36],
    iconAnchor: [15, 34],
  });
}

function createPickedIcon(): L.DivIcon {
  return L.divIcon({
    className: "directory-map-picked-marker",
    html: `
      <span style="
        display:block;
        width:24px;
        height:24px;
        background:#16a34a;
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 10px rgba(0,0,0,.3);
      "></span>
    `,
    iconSize: [30, 36],
    iconAnchor: [15, 34],
  });
}

export default function DirectoryMap({
  places,
  selectedId,
  onSelect,
  onPickLocation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const pickedMarkerRef = useRef<L.Marker | null>(null);

  const onSelectRef = useRef(onSelect);
  const onPickLocationRef = useRef(onPickLocation);

  onSelectRef.current = onSelect;
  onPickLocationRef.current = onPickLocation;

  const [mapReady, setMapReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [pickedCoordinates, setPickedCoordinates] =
    useState<Coordinates | null>(null);

  const validPlaces = useMemo(
    () =>
      places.flatMap((place) => {
        const coordinates = getPlaceCoordinates(place);

        return coordinates ? [{ place, coordinates }] : [];
      }),
    [places],
  );

  // 1. Khởi tạo Leaflet đúng một lần trong mỗi lần mount.
  useEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    let disposed = false;
    let resizeFrame: number | null = null;

    const map = L.map(element, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: false,
      zoomControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });

    mapRef.current = map;
    setMapReady(true);

    const isActive = () =>
      !disposed && mapRef.current === map && element.isConnected;

    const handleResize = () => {
      if (!isActive()) return;

      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;

        if (!isActive()) return;

        map.invalidateSize({
          animate: false,
          pan: false,
        });
      });
    };

    const handleMapClick = (event: L.LeafletMouseEvent) => {
      if (!isActive() || !onPickLocationRef.current) return;

      const coordinates: Coordinates = [
        Number(event.latlng.lat.toFixed(7)),
        Number(event.latlng.lng.toFixed(7)),
      ];

      setPickedCoordinates(coordinates);
      onPickLocationRef.current(coordinates);
    };

    map.on("click", handleMapClick);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleResize)
        : undefined;

    observer?.observe(element);
    window.addEventListener("resize", handleResize);

    handleResize();

    return () => {
      disposed = true;

      observer?.disconnect();
      window.removeEventListener("resize", handleResize);

      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }

      map.off("click", handleMapClick);

      // Dọn dẹp layer khi bản đồ vẫn còn hoạt động.
      const pickedMarker = pickedMarkerRef.current;
      if (pickedMarker && map.hasLayer(pickedMarker)) {
        map.removeLayer(pickedMarker);
      }

      const markerLayer = markerLayerRef.current;
      if (markerLayer && map.hasLayer(markerLayer)) {
        map.removeLayer(markerLayer);
      }

      pickedMarkerRef.current = null;
      markerLayerRef.current = null;
      markersRef.current.clear();

      map.stop();

      if (mapRef.current === map) {
        mapRef.current = null;
      }

      map.remove();
    };
  }, []);

  // 2. Nền bản đồ và chế độ dự phòng.
  useEffect(() => {
    if (!mapReady) return;

    const map = mapRef.current;
    if (!map) return;

    const source = TILE_SOURCES[sourceIndex];
    if (!source) return;

    let disposed = false;
    let switching = false;
    let loaded = 0;
    let failed = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const isActive = () => !disposed && mapRef.current === map;

    const clearTimer = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    const fallback = () => {
      if (!isActive() || switching) return;

      switching = true;
      clearTimer();

      if (sourceIndex < TILE_SOURCES.length - 1) {
        setSourceIndex(sourceIndex + 1);
      } else {
        setTileError(true);
      }
    };

    const tileLayer = L.tileLayer(source.url, {
      attribution: source.attribution,
      maxZoom: 19,
      referrerPolicy: "strict-origin-when-cross-origin",
    });

    tileLayer.on("loading", () => {
      if (!isActive()) return;

      loaded = 0;
      failed = 0;
      clearTimer();

      timer = setTimeout(() => {
        if (isActive() && loaded === 0) {
          fallback();
        }
      }, 8000);
    });

    tileLayer.on("tileload", () => {
      if (!isActive()) return;

      loaded += 1;
      setTileError(false);
      clearTimer();
    });

    tileLayer.on("tileerror", () => {
      if (!isActive()) return;
      failed += 1;
    });

    tileLayer.on("load", () => {
      if (!isActive()) return;

      clearTimer();

      if (loaded === 0 && failed > 0) {
        fallback();
      }
    });

    tileLayer.addTo(map);

    return () => {
      disposed = true;
      clearTimer();

      tileLayer.off();

      if (mapRef.current === map && map.hasLayer(tileLayer)) {
        map.removeLayer(tileLayer);
      }
    };
  }, [mapReady, sourceIndex, retryKey]);

  // 3. Hiển thị ghim địa điểm.
  // Không gọi fitBounds hoặc setView trong effect này.
  useEffect(() => {
    if (!mapReady) return;

    const map = mapRef.current;
    if (!map) return;

    let disposed = false;

    const group = L.layerGroup().addTo(map);
    const markers = new Map<string, L.Marker>();

    markerLayerRef.current = group;

    for (const { place, coordinates } of validPlaces) {
      const marker = L.marker(coordinates, {
        title: place.name,
        icon: createMarkerIcon(place.id === selectedId),
        keyboard: true,
      });

      const label = document.createElement("span");
      label.textContent = place.name;

      marker.bindTooltip(label, {
        direction: "top",
        offset: [0, -20],
      });

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);

        if (disposed || mapRef.current !== map) return;

        onSelectRef.current(place.id);
      });

      marker.addTo(group);
      markers.set(place.id, marker);
    }

    markersRef.current = markers;

    console.info(
      "[DirectoryMap] Tổng địa điểm:",
      places.length,
      "Có tọa độ:",
      validPlaces.length,
      "Marker:",
      markers.size,
    );

    if (validPlaces.length < places.length) {
      console.warn(
        "[DirectoryMap] Các địa điểm chưa có tọa độ:",
        places
          .filter((place) => !getPlaceCoordinates(place))
          .map((place) => ({
            id: place.id,
            name: place.name,
            status: place.mapLocation?.status ?? "unknown",
          })),
      );
    }

    return () => {
      disposed = true;

      if (markersRef.current === markers) {
        markersRef.current = new Map();
      }

      if (markerLayerRef.current === group) {
        markerLayerRef.current = null;
      }

      if (mapRef.current === map && map.hasLayer(group)) {
        map.removeLayer(group);
      }
    };
  }, [mapReady, validPlaces]);

  // 4. Cập nhật biểu tượng marker được chọn.
  // Không tự động di chuyển bản đồ trong bản chẩn đoán.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    for (const [id, marker] of markersRef.current) {
      marker.setIcon(createMarkerIcon(id === selectedId));
    }
  }, [mapReady, selectedId, validPlaces]);

  // 5. Cho phép ghim tọa độ người dùng chọn.
  useEffect(() => {
    if (!mapReady) return;

    const map = mapRef.current;
    if (!map) return;

    if (!pickedCoordinates) return;

    const marker = L.marker(pickedCoordinates, {
      icon: createPickedIcon(),
      title: "Vị trí đã chọn",
    }).addTo(map);

    pickedMarkerRef.current = marker;

    return () => {
      if (pickedMarkerRef.current === marker) {
        pickedMarkerRef.current = null;
      }

      if (mapRef.current === map && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    };
  }, [mapReady, pickedCoordinates]);

  const retryTiles = () => {
    setTileError(false);
    setSourceIndex(0);
    setRetryKey((key) => key + 1);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="directory-map"
        role="region"
        aria-label="Bản đồ địa điểm"
      />

      {onPickLocation && pickedCoordinates && (
        <p className="directory-map-note">
          Vị trí đã chọn: {pickedCoordinates[0].toFixed(6)},{" "}
          {pickedCoordinates[1].toFixed(6)}
        </p>
      )}

      {sourceIndex > 0 && !tileError && (
        <p className="directory-map-note">Đang sử dụng ảnh vệ tinh dự phòng.</p>
      )}

      {tileError && (
        <div className="directory-warning" role="alert">
          <p>
            Chưa tải được nền bản đồ. Bạn vẫn có thể mở chỉ đường bằng Google
            Maps.
          </p>

          <button type="button" onClick={retryTiles}>
            Thử tải lại
          </button>
        </div>
      )}
    </>
  );
}
