import ContentReviews from "@/components/content-reviews";
import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import PreviewableImage from "@/components/previewable-image";
import templePlaceholder from "@/static/temple.png";
import { getTempleById, TempleDetail } from "@/services/temples";
import "../css/pages/temples.css";

function TempleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [temple, setTemple] = useState<TempleDetail | null>(null);
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
        setTemple(await getTempleById(id!, controller.signal));
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
      <Page className="temples-page">
        <main className="temples-content">
          <p className="temples-status">Đang tải địa điểm...</p>
        </main>
      </Page>
    );
  }

  if (!temple || error) {
    return (
      <Page className="temples-page">
        <header className="temples-header">
          <button
            className="temples-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy"}</h1>
        </header>
        <main className="temples-content">
          <p className="temple-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Địa điểm này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="temple-detail__retry"
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
    <Page className="temples-page">
      <section className="temple-detail__hero">
        <PreviewableImage
          src={temple.imageUrl || templePlaceholder}
          alt={temple.imageAlt || temple.name}
          previewTitle={temple.name}
        />
        <button
          className="temples-back temple-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="temples-content temple-detail__content">
        <section className="temple-detail__card">
          <span className="temple-card__type">{temple.type}</span>
          <h1 className="temple-detail__name">{temple.name}</h1>

          <ul className="temple-detail__info">
            <li>
              <Icon icon="zi-location" />
              <span>{temple.address}</span>
            </li>
            <li>
              <Icon icon="zi-clock-1" />
              <span>{temple.openHours}</span>
            </li>
          </ul>
          <DirectionsButton googleMapsUrl={temple.googleMapsUrl} />
        </section>

        <section className="temple-detail__card">
          <h2 className="temple-detail__section-title">
            <span />
            Giới thiệu
          </h2>
          {temple.description.map((paragraph) => (
            <p className="temple-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="temple-detail__card">
          <h2 className="temple-detail__section-title">
            <span />
            Lễ hội - Sự kiện
          </h2>
          {temple.events.length === 0 ? (
            <p className="temple-detail__empty">Chưa có sự kiện được cập nhật.</p>
          ) : (
            <ul className="temple-detail__events">
              {temple.events.map((event) => (
                <li key={event.id}>
                  <span className="temple-detail__event-time">{event.time}</span>
                  <span>{event.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <ContentReviews targetType="temples" targetId={temple.id} title={temple.name} />
      </main>
    </Page>
  );
}

export default TempleDetailPage;
