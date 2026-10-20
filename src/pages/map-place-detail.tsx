import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import PreviewableImage from "@/components/previewable-image";
import { MapPlace } from "@/data/map-places";
import { getResolvedMapCoordinates } from "@/data/map-location";
import { getMapPlaceById } from "@/services/map-places";
import "../css/pages/map-places.css";

function MapPlaceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<MapPlace>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not-found" | "request" | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const coordinates = getResolvedMapCoordinates(place?.mapLocation);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    if (!id) {
      setError("not-found");
      setIsLoading(false);
      return () => controller.abort();
    }
    async function load(): Promise<void> {
      try {
        setPlace(await getMapPlaceById(id!, controller.signal));
      } catch (requestError: unknown) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error && requestError.message === "NOT_FOUND" ? "not-found" : "request");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [id, retryKey]);

  if (isLoading) {
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
        <p className="map-places-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!place || error) {
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
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy địa điểm"}</h1>
        </header>
        <main className="map-places-content">
          <p className="map-place-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Địa điểm này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="map-place-detail__retry"
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
            >
              Thử lại
            </button>
          )}
        </main>
      </Page>
    );
  }

  return (
    <Page className="map-places-page">
      <section className="map-place-detail__hero">
        <PreviewableImage src={place.image} alt={place.name} previewTitle={place.name} />
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
          <h2>Vị trí địa điểm</h2>
          {coordinates ? <div>
            <span>Lat: {coordinates[0]}</span>
            <span>Lng: {coordinates[1]}</span>
          </div> : <p className="map-place-detail__paragraph">
            {place.mapLocation?.status === "pending"
              ? "Vị trí đang được cập nhật. Bạn có thể mở Google Maps để xem đường đi."
              : "Chưa có tọa độ xác định. Mở Google Maps để xem vị trí nếu địa điểm đã có link."}
          </p>}
          <DirectionsButton googleMapsUrl={place.googleMapsUrl} />
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
