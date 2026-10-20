import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";
import DirectionsButton from "@/components/directions-button";
import DirectoryMap from "@/components/directory-map";
import { DirectoryCategory, DirectoryPlace, getMapDirectory } from "@/services/map-directory";
import "../css/pages/map-places.css";

const filters: ("Tất cả" | DirectoryCategory)[] = ["Tất cả", "Du lịch", "Ăn uống", "Đền miếu", "Địa điểm khác"];
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

function locationLabel(place: DirectoryPlace): string {
  if (place.coordinates) return "Đã có vị trí";
  if (place.mapLocation?.status === "pending") return "Đang cập nhật vị trí";
  if (place.mapLocation?.status === "failed") return "Chưa định vị được";
  return "Chưa xác định vị trí";
}

function MapPlacesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("Tất cả");
  const [places, setPlaces] = useState<DirectoryPlace[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [retryKey, setRetryKey] = useState(0);
  const mapPanel = useRef<HTMLElement>(null);
  const hasLoaded = useRef(false);
  useEffect(() => {
    let active = true;
    setIsLoading(!hasLoaded.current);
    setIsRefreshing(hasLoaded.current);
    getMapDirectory().then(result => {
      if (!active) return;
      setPlaces(result.places);
      setFailedSources(result.failedSources);
    }).catch(() => {
      if (active) setFailedSources(["Bản đồ", "Ăn uống", "Đền miếu", "Di tích"]);
    }).finally(() => {
      if (!active) return;
      hasLoaded.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    });
    return () => { active = false; };
  }, [retryKey]);

  useEffect(() => {
    if (isLoading || isRefreshing || !places.some(place => place.mapLocation?.status === "pending")) return;
    const timer = setTimeout(() => setRetryKey(value => value + 1), 15000);
    return () => clearTimeout(timer);
  }, [places, isLoading, isRefreshing]);

  const visiblePlaces = useMemo(() => places.filter(place =>
    (activeFilter === "Tất cả" || place.categories.includes(activeFilter)) &&
    normalize(`${place.name} ${place.address} ${place.summary}`).includes(normalize(query.trim()))
  ), [places, activeFilter, query]);
  const locatedCount = visiblePlaces.filter(place => place.coordinates).length;
  const selectPlace = useCallback((id: string) => {
    setSelectedId(id);
    document.getElementById(`directory-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <Page className="map-places-page">
      <header className="map-places-header">
        <button className="map-places-back" type="button" aria-label="Quay lại" onClick={() => navigate(-1)}><Icon icon="zi-arrow-left" /></button>
        <div><span>Khám phá Truông Mít</span><h1>Bản đồ địa điểm</h1></div>
      </header>
      <main className="map-places-content">
        <div className="directory-intro"><h2>Đi đâu, ăn gì hôm nay?</h2><p>Khám phá điểm du lịch, quán ăn và đền miếu đã có link Google Maps.</p></div>
        <label className="directory-search"><Icon icon="zi-search" /><input type="search" aria-label="Tìm địa điểm" placeholder="Tìm tên địa điểm, địa chỉ…" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="map-places-filters" aria-label="Nhóm địa điểm">
          {filters.map(filter => <button className={`map-places-filter${filter === activeFilter ? " map-places-filter--active" : ""}`} key={filter} type="button" aria-pressed={filter === activeFilter} onClick={() => { setActiveFilter(filter); setSelectedId(undefined); }}>{filter} <span>{filter === "Tất cả" ? places.length : places.filter(place => place.categories.includes(filter)).length}</span></button>)}
        </div>
        <section className="directory-map-panel" ref={mapPanel}>
          <DirectoryMap places={visiblePlaces} selectedId={selectedId} onSelect={selectPlace} />
          <p className="directory-map-note">{locatedCount} ghim trên bản đồ · {visiblePlaces.length} địa điểm trong danh sách</p>
          {visiblePlaces.length > locatedCount && <p className="directory-map-note">{locatedCount === 0 ? "Các địa điểm chưa có vị trí xác định để đặt ghim. " : "Một số địa điểm chưa có vị trí xác định. "}Bạn vẫn có thể bấm biểu tượng vị trí trên thẻ để mở Google Maps.</p>}
          <button className="directory-refresh" type="button" disabled={isLoading || isRefreshing} onClick={() => setRetryKey(value => value + 1)}><Icon icon="zi-retry" />{isRefreshing ? "Đang cập nhật…" : "Cập nhật vị trí"}</button>
        </section>
        {isLoading && <p className="map-places-status" role="status">Đang tải địa điểm…</p>}
        {!isLoading && failedSources.length > 0 && <div className="directory-warning" role="alert">Chưa tải được: {failedSources.join(", ")}.<button type="button" onClick={() => setRetryKey(value => value + 1)}>Thử lại</button></div>}
        {!isLoading && <>
          <div className="directory-results"><h2>{visiblePlaces.length} địa điểm</h2><span>{activeFilter}</span></div>
          {visiblePlaces.length === 0 && <p className="map-places-status">{places.length ? "Không tìm thấy địa điểm phù hợp. Thử từ khóa hoặc nhóm khác." : failedSources.length ? "Hãy thử tải lại để xem đầy đủ địa điểm." : "Chưa có địa điểm được khai báo link Google Maps."}</p>}
          <section className="map-places-list" aria-label="Danh sách địa điểm">
            {visiblePlaces.map(place => <article id={`directory-${place.id}`} className={`directory-card${selectedId === place.id ? " directory-card--selected" : ""}`} key={place.id}>
              <div className="directory-card-main"><img className="directory-card-image" src={place.image} alt="" loading="lazy" /><div className="directory-card-body">
                <div className="directory-card-tags">{place.categories.map(category => <span key={category}>{category}</span>)}</div>
                <h2>{place.name}</h2>
                {place.address && <p className="directory-card-address"><Icon icon="zi-location" /><span>{place.address}</span></p>}
              </div></div>
              {place.summary && place.summary !== place.name && <p className="directory-card-summary">{place.summary}</p>}
              <p className={`directory-card-location${place.coordinates ? " directory-card-location--resolved" : ""}`}><span aria-hidden="true" />{locationLabel(place)}</p>
              <div className="directory-card-actions">
                <button type="button" onClick={() => navigate(place.detailPath)}>Chi tiết</button>
                {place.coordinates && <button type="button" aria-pressed={selectedId === place.id} onClick={() => { setSelectedId(place.id); mapPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Xem ghim</button>}
                <div className="directory-card-directions"><DirectionsButton googleMapsUrl={place.googleMapsUrl} label={`Chỉ đường đến ${place.name}`} iconOnly /></div>
              </div>
            </article>)}
          </section>
        </>}
      </main>
    </Page>
  );
}
export default MapPlacesPage;
