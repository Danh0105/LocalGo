import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import ContentGallery from "@/components/content-gallery";
import { Specialty } from "@/data/specialties";
import { getSpecialtyById } from "@/services/specialties";
import "../css/pages/specialties.css";

function SpecialtyDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [specialty, setSpecialty] = useState<Specialty>();
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
        setSpecialty(await getSpecialtyById(id!, controller.signal));
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
      <Page className="specialties-page">
        <p className="specialties-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!specialty || error) {
    return (
      <Page className="specialties-page">
        <header className="specialties-header">
          <button
            className="specialties-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy"}</h1>
        </header>
        <main className="specialties-content">
          <p className="specialty-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Đặc sản này không tồn tại hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="specialty-detail__retry"
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
    <Page className="specialties-page">
      <section className={`specialty-detail__hero${specialty.galleryImages?.length ? " content-detail-hero--gallery" : ""}`}>
        <ContentGallery imageUrl={specialty.imageUrl} imageAlt={specialty.imageAlt} galleryImages={specialty.galleryImages} fallbackSrc={specialty.image} title={specialty.name} />
        <button
          className="specialties-back specialty-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="specialties-content specialty-detail__content">
        <section className="specialty-detail__card">
          <span className="specialty-card__category">
            {specialty.category}
          </span>
          <h1 className="specialty-detail__name">{specialty.name}</h1>

          <ul className="specialty-detail__info">
            <li>
              <Icon icon="zi-note" />
              <span>{specialty.price}</span>
            </li>
            <li>
              <Icon icon="zi-clock-1" />
              <span>{specialty.season}</span>
            </li>
          </ul>
          <DirectionsButton googleMapsUrl={specialty.googleMapsUrl} />
        </section>

        <section className="specialty-detail__card">
          <h2 className="specialty-detail__section-title">
            <span />
            Giới thiệu
          </h2>
          {specialty.description.map((paragraph) => (
            <p className="specialty-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="specialty-detail__card">
          <h2 className="specialty-detail__section-title">
            <span />
            Mua ở đâu
          </h2>
          <ul className="specialty-detail__places">
            {specialty.buyPlaces.map((place) => (
              <li key={place}>
                <Icon icon="zi-location" />
                <span>{place}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Page>
  );
}

export default SpecialtyDetailPage;
