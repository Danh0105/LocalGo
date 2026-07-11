import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { MapPlace } from "@/data/map-places";
import { getMapPlaceById } from "@/services/map-places";
import "../css/pages/map-places.css";

function MapPlaceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<MapPlace>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setPlace(undefined);
      setIsLoading(false);
      return;
    }

    getMapPlaceById(id).then((data) => {
      if (!isActive) return;
      setPlace(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="map-places-page">
        <p className="map-places-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!place) {
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
          <h1>Không tìm thấy địa điểm</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="map-places-page">
      <section className="map-place-detail__hero">
        <img src={place.image} alt="" />
        <button
          className="map-places-back map-place-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="map-place-detail__content">
        <section className="map-place-detail__card">
          <span className="map-place-card__category">{place.category}</span>
          <h1>{place.name}</h1>
          <ul className="map-place-detail__meta">
            <li>
              <Icon icon="zi-location" />
              <span>{place.address}</span>
            </li>
            <li>
              <Icon icon="zi-clock-1" />
              <span>{place.openTime}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{place.distanceFromCenter}</span>
            </li>
          </ul>
        </section>

        <section className="map-place-detail__card map-place-detail__coords">
          <h2>Tọa độ mẫu</h2>
          <div>
            <span>Lat: {place.coordinates.lat}</span>
            <span>Lng: {place.coordinates.lng}</span>
          </div>
        </section>

        <section className="map-place-detail__card">
          <h2>Giới thiệu địa điểm</h2>
          {place.description.map((paragraph) => (
            <p className="map-place-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="map-place-detail__card">
          <h2>Điểm nổi bật</h2>
          <ul className="map-place-detail__highlights">
            {place.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle-solid" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="map-place-detail__card map-place-detail__note">
          <h2>Gợi ý chỉ đường</h2>
          <p className="map-place-detail__paragraph">{place.directionNote}</p>
        </section>
      </main>
    </Page>
  );
}

export default MapPlaceDetailPage;
