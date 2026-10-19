import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import PreviewableImage from "@/components/previewable-image";
import { Festival } from "@/data/festivals";
import { getFestivalById } from "@/services/festivals";
import "../css/pages/festivals.css";

function FestivalDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [festival, setFestival] = useState<Festival>();
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
        setFestival(await getFestivalById(id!, controller.signal));
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
      <Page className="festivals-page">
        <p className="festivals-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!festival || error) {
    return (
      <Page className="festivals-page">
        <header className="festivals-header">
          <button
            className="festivals-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy lễ hội"}</h1>
        </header>
        <main className="festivals-content">
          <p className="festival-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Lễ hội này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="festival-detail__retry"
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
    <Page className="festivals-page">
      <section className="festival-detail__hero">
        <PreviewableImage
          src={festival.image}
          alt={festival.name}
          previewTitle={festival.name}
        />
        <button
          className="festivals-back festival-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="festival-detail__content">
        <section className="festival-detail__card">
          <span className="festival-card__category">{festival.category}</span>
          <h1>{festival.name}</h1>
          <ul className="festival-detail__meta">
            <li>
              <Icon icon="zi-calendar" />
              <span>{festival.time}</span>
            </li>
            <li>
              <Icon icon="zi-location" />
              <span>{festival.location}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{festival.scale}</span>
            </li>
          </ul>
          <DirectionsButton googleMapsUrl={festival.googleMapsUrl} />
        </section>

        <section className="festival-detail__card">
          <h2>Giới thiệu lễ hội</h2>
          {festival.description.map((paragraph) => (
            <p className="festival-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="festival-detail__card">
          <h2>Hoạt động chính</h2>
          <ul className="festival-detail__activities">
            {festival.activities.map((activity) => (
              <li key={activity}>
                <Icon icon="zi-check-circle-solid" />
                <span>{activity}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="festival-detail__card festival-detail__note">
          <h2>Lưu ý</h2>
          <p className="festival-detail__paragraph">{festival.note}</p>
        </section>
      </main>
    </Page>
  );
}

export default FestivalDetailPage;
