import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { MapPlace, MapPlaceCategory } from "@/data/map-places";
import { getMapPlaces } from "@/services/map-places";
import "../css/pages/map-places.css";

type MapPlaceFilter = "Tất cả" | MapPlaceCategory;

const filters: MapPlaceFilter[] = [
  "Tất cả",
  "Hành chính",
  "Du lịch",
  "Di tích",
  "Ẩm thực",
  "Dịch vụ",
];

function MapPlacesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<MapPlaceFilter>("Tất cả");
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getMapPlaces({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setPlaces(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải dữ liệu bản đồ.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

  return (
    <Page className="map-places-page">
      <header className="map-places-header">
        <button
          className="map-places-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Điểm đến quanh xã</span>
          <h1>Bản đồ</h1>
        </div>
      </header>

      <main className="map-places-content">
        <section className="map-places-preview">
          <div className="map-places-preview__grid">
            {places.slice(0, 5).map((place, index) => (
              <span
                className={`map-places-preview__pin map-places-preview__pin--${
                  index + 1
                }`}
                key={place.id}
              >
                <Icon icon="zi-location-solid" />
              </span>
            ))}
          </div>
          <p>
            Bản đồ minh họa. Khi tích hợp API, khu vực này có thể thay bằng
            Zalo Map/Google Map hoặc bản đồ nội bộ.
          </p>
        </section>

        <div className="map-places-filters">
          {filters.map((filter) => (
            <button
              className={`map-places-filter${
                filter === activeFilter ? " map-places-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {isLoading && <p className="map-places-status">Đang tải dữ liệu...</p>}
        {!isLoading && error && (
          <p className="map-places-status map-places-status--error">{error}</p>
        )}
        {!isLoading && !error && places.length === 0 && (
          <p className="map-places-status">Chưa có địa điểm trong nhóm này.</p>
        )}

        {!isLoading && !error && (
          <section className="map-places-list">
            {places.map((place) => (
              <button
                className="map-place-card"
                key={place.id}
                type="button"
                onClick={() => navigate(`/map/${place.id}`)}
              >
                <div className="map-place-card__image">
                  <img src={place.image} alt="" />
                </div>
                <div className="map-place-card__body">
                  <span className="map-place-card__category">
                    {place.category}
                  </span>
                  <h2>{place.name}</h2>
                  <p className="map-place-card__address">
                    <Icon icon="zi-location" />
                    <span>{place.address}</span>
                  </p>
                  <p className="map-place-card__summary">{place.summary}</p>
                </div>
                <Icon className="map-place-card__arrow" icon="zi-chevron-right" />
              </button>
            ))}
          </section>
        )}
      </main>
    </Page>
  );
}

export default MapPlacesPage;
