import ContentReviews from "@/components/content-reviews";
import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import ContentGallery from "@/components/content-gallery";
import { AgricultureItem } from "@/data/agriculture";
import { getAgricultureItemById } from "@/services/agriculture";
import "../css/pages/agriculture.css";

function AgricultureDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<AgricultureItem>();
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
        setItem(await getAgricultureItemById(id!, controller.signal));
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
      <Page className="agriculture-page">
        <p className="agriculture-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!item || error) {
    return (
      <Page className="agriculture-page">
        <header className="agriculture-header">
          <button
            className="agriculture-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy dữ liệu"}</h1>
        </header>
        <main className="agriculture-content">
          <p className="agriculture-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Mô hình này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="agriculture-detail__retry"
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
    <Page className="agriculture-page">
      <section className={`agriculture-detail__hero${item.galleryImages?.length ? " content-detail-hero--gallery" : ""}`}>
        <ContentGallery imageUrl={item.imageUrl} imageAlt={item.imageAlt} galleryImages={item.galleryImages} fallbackSrc={item.image} title={item.name} />
        <button
          className="agriculture-back agriculture-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="agriculture-detail__content">
        <section className="agriculture-detail__card">
          <span className="agriculture-card__category">{item.category}</span>
          <h1>{item.name}</h1>
          <ul className="agriculture-detail__meta">
            <li>
              <Icon icon="zi-location" />
              <span>{item.location}</span>
            </li>
            <li>
              <Icon icon="zi-calendar" />
              <span>{item.season}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{item.scale}</span>
            </li>
          </ul>
          <DirectionsButton googleMapsUrl={item.googleMapsUrl} />
        </section>

        <section className="agriculture-detail__card">
          <h2>Thông tin mô hình</h2>
          {item.description.map((paragraph) => (
            <p className="agriculture-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="agriculture-detail__card">
          <h2>Điểm nổi bật</h2>
          <ul className="agriculture-detail__highlights">
            {item.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle-solid" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="agriculture-detail__card agriculture-detail__support">
          <h2>Hỗ trợ người dân</h2>
          <p className="agriculture-detail__paragraph">{item.support}</p>
        </section>
        <ContentReviews targetType="agriculture" targetId={item.id} title={item.name} />
      </main>
    </Page>
  );
}

export default AgricultureDetailPage;
