import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import PreviewableImage from "@/components/previewable-image";
import { CuisineItem } from "@/data/cuisine";
import { getCuisineItemById } from "@/services/cuisine";
import "../css/pages/cuisine.css";

function CuisineDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<CuisineItem>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not-found" | "request" | null>(null);
  const [retryKey, setRetryKey] = useState(0);

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
        setItem(await getCuisineItemById(id!, controller.signal));
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
      <Page className="cuisine-page">
        <p className="cuisine-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!item || error) {
    return (
      <Page className="cuisine-page">
        <header className="cuisine-header">
          <button
            className="cuisine-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy món ăn"}</h1>
        </header>
        <main className="cuisine-content">
          <p className="cuisine-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Món ăn này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="cuisine-detail__retry"
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
    <Page className="cuisine-page">
      <section className="cuisine-detail__hero">
        <PreviewableImage src={item.image} alt={item.name} previewTitle={item.name} />
        <button
          className="cuisine-back cuisine-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="cuisine-detail__content">
        <section className="cuisine-detail__card">
          <span className="cuisine-card__category">{item.category}</span>
          <h1>{item.name}</h1>
          <ul className="cuisine-detail__meta">
            <li>
              <Icon icon="zi-note" />
              <span>{item.priceRange}</span>
            </li>
            <li>
              <Icon icon="zi-clock-1" />
              <span>{item.bestTime}</span>
            </li>
          </ul>
          <DirectionsButton googleMapsUrl={item.googleMapsUrl} />
        </section>

        <section className="cuisine-detail__card">
          <h2>Giới thiệu món ăn</h2>
          {item.description.map((paragraph) => (
            <p className="cuisine-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="cuisine-detail__card">
          <h2>Điểm thú vị</h2>
          <ul className="cuisine-detail__highlights">
            {item.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle-solid" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cuisine-detail__card">
          <h2>Gợi ý địa điểm</h2>
          <ul className="cuisine-detail__places">
            {item.suggestedPlaces.map((place) => (
              <li key={place}>
                <Icon icon="zi-location" />
                <span>{place}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cuisine-detail__card cuisine-detail__tip">
          <h2>Mẹo nhỏ</h2>
          <p className="cuisine-detail__paragraph">{item.tip}</p>
        </section>
      </main>
    </Page>
  );
}

export default CuisineDetailPage;
