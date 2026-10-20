import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DirectoryPlace } from "@/services/map-directory";

interface Props {
  places: DirectoryPlace[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const tileSources = [
  {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
  },
  {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noopener noreferrer">Esri</a>, Maxar, Earthstar Geographics, GIS User Community',
  },
];

export default function DirectoryMap({ places, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map>();
  const [tileError, setTileError] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false }).setView([11.2418, 106.2024], 12);
    mapRef.current = map;
    const resize = () => { map.invalidateSize(); };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : undefined;
    observer?.observe(container.current);
    window.addEventListener("resize", resize);
    return () => { observer?.disconnect(); window.removeEventListener("resize", resize); map.remove(); mapRef.current = undefined; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let disposed = false;
    let switching = false;
    let loaded = 0;
    let failed = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setTileError(false);
    const source = tileSources[sourceIndex];
    const fallback = () => {
      if (disposed || switching) return;
      switching = true;
      clearTimeout(timeout);
      if (sourceIndex < tileSources.length - 1) setSourceIndex(sourceIndex + 1);
      else setTileError(true);
    };
    const layer = L.tileLayer(source.url, {
      attribution: source.attribution,
      maxZoom: 19,
      // Send the page origin where the WebView supports referrers.
      referrerPolicy: "strict-origin-when-cross-origin",
    });
    layer.on("loading", () => {
      loaded = 0;
      failed = 0;
      clearTimeout(timeout);
      timeout = setTimeout(() => { if (!loaded) fallback(); }, 8000);
    });
    layer.on("tileload", () => {
      if (disposed) return;
      loaded += 1;
      setTileError(false);
      clearTimeout(timeout);
    });
    layer.on("tileerror", () => { failed += 1; });
    layer.on("load", () => {
      clearTimeout(timeout);
      if (!loaded && failed) fallback();
    });
    layer.addTo(map);
    return () => { disposed = true; clearTimeout(timeout); layer.off(); layer.remove(); };
  }, [sourceIndex, retryKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.featureGroup().addTo(map);
    for (const place of places) {
      if (!place.coordinates) continue;
      const label = document.createElement("span");
      label.textContent = place.name;
      L.marker(place.coordinates, {
        title: place.name,
        icon: L.divIcon({ className: "directory-map-marker", html: `<span class="directory-map-pin${place.id === selectedId ? " is-selected" : ""}"></span>`, iconSize: [28, 36], iconAnchor: [14, 36] }),
      }).bindTooltip(label).on("click", () => onSelect(place.id)).addTo(layer);
    }
    if (layer.getLayers().length) map.fitBounds(layer.getBounds(), { padding: [35, 35], maxZoom: 15 });
    return () => { layer.remove(); };
  }, [places, onSelect, selectedId]);

  useEffect(() => {
    const selected = places.find(place => place.id === selectedId);
    if (selected?.coordinates) mapRef.current?.setView(selected.coordinates, 16);
  }, [selectedId, places]);

  return <>
    <div ref={container} className="directory-map" role="region" aria-label="Bản đồ địa điểm" />
    {sourceIndex > 0 && !tileError && <p className="directory-map-note">Đang dùng nền ảnh vệ tinh dự phòng.</p>}
    {tileError && <div className="directory-warning" role="alert">Chưa tải được nền bản đồ. Bạn vẫn có thể mở chỉ đường trong danh sách.<button type="button" onClick={() => { setSourceIndex(0); setRetryKey(value => value + 1); }}>Tải lại bản đồ</button></div>}
  </>;
}
