import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import PreviewableImage from "@/components/previewable-image";
import { ExperienceTour } from "@/data/experience-tours";
import { getExperienceTourById } from "@/services/experience-tours";
import "../css/pages/experience-tours.css";

function ExperienceTourDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tour, setTour] = useState<ExperienceTour>();
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
        setTour(await getExperienceTourById(id!, controller.signal));
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
      <Page className="experience-tours-page">
        <p className="experience-tours-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!tour || error) {
    return (
      <Page className="experience-tours-page">
        <header className="experience-tours-header">
          <button
            className="experience-tours-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy tour"}</h1>
        </header>
        <main className="experience-tours-content">
          <p className="experience-tour-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Tour này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="experience-tour-detail__retry"
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
    <Page className="experience-tours-page">
      <section className="experience-tour-detail__hero">
        <PreviewableImage src={tour.image} alt={tour.name} previewTitle={tour.name} />
        <button
          className="experience-tours-back experience-tour-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="experience-tour-detail__content">
        <section className="experience-tour-detail__card">
          <span className="experience-tour-card__category">
            {tour.category}
          </span>
          <h1>{tour.name}</h1>
          <ul className="experience-tour-detail__meta">
            <li>
              <Icon icon="zi-clock-1" />
              <span>{tour.duration}</span>
            </li>
            <li>
              <Icon icon="zi-calendar" />
              <span>{tour.startTime}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{tour.priceRange}</span>
            </li>
            <li>
              <Icon icon="zi-location" />
              <span>{tour.meetingPoint}</span>
            </li>
            {tour.contactPhone && (
              <li>
                <Icon icon="zi-call" />
                <a href={`tel:${tour.contactPhone.replace(/[^\d+]/g, "")}`}>
                  {tour.contactPhone}
                </a>
              </li>
            )}
          </ul>
        </section>

        <section className="experience-tour-detail__card">
          <h2>Giới thiệu tour</h2>
          {tour.description.map((paragraph) => (
            <p className="experience-tour-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="experience-tour-detail__card">
          <h2>Lịch trình dự kiến</h2>
          <ol className="experience-tour-detail__timeline">
            {tour.itinerary.map((item) => (
              <li key={item}>
                <span />
                <p>{item}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="experience-tour-detail__card">
          <h2>Bao gồm</h2>
          <ul className="experience-tour-detail__included">
            {tour.included.map((item) => (
              <li key={item}>
                <Icon icon="zi-check-circle-solid" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="experience-tour-detail__card experience-tour-detail__note">
          <h2>Lưu ý đặt tour</h2>
          <p className="experience-tour-detail__paragraph">{tour.note}</p>
        </section>
      </main>
    </Page>
  );
}

export default ExperienceTourDetailPage;
