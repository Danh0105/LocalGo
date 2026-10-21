import ContentReviews from "@/components/content-reviews";
import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import ContentGallery from "@/components/content-gallery";
import { CraftVillage } from "@/data/craft-villages";
import { getCraftVillageById } from "@/services/craft-villages";
import "../css/pages/craft-villages.css";

function CraftVillageDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [village, setVillage] = useState<CraftVillage>();
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
        setVillage(await getCraftVillageById(id!, controller.signal));
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
      <Page className="craft-villages-page">
        <p className="craft-villages-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!village || error) {
    return (
      <Page className="craft-villages-page">
        <header className="craft-villages-header">
          <button
            className="craft-villages-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy làng nghề"}</h1>
        </header>
        <main className="craft-villages-content">
          <p className="craft-village-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Làng nghề này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="craft-village-detail__retry"
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
    <Page className="craft-villages-page">
      <section className={`craft-village-detail__hero${village.galleryImages?.length ? " content-detail-hero--gallery" : ""}`}>
        <ContentGallery imageUrl={village.imageUrl} imageAlt={village.imageAlt} galleryImages={village.galleryImages} fallbackSrc={village.image} title={village.name} />
        <button
          className="craft-villages-back craft-village-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="craft-village-detail__content">
        <section className="craft-village-detail__card">
          <span className="craft-village-card__category">
            {village.category}
          </span>
          <h1>{village.name}</h1>
          <ul className="craft-village-detail__meta">
            <li>
              <Icon icon="zi-location" />
              <span>{village.address}</span>
            </li>
            <li>
              <Icon icon="zi-clock-1" />
              <span>{village.workingTime}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{village.mainProducts}</span>
            </li>
          </ul>
          <DirectionsButton googleMapsUrl={village.googleMapsUrl} />
        </section>

        <section className="craft-village-detail__card">
          <h2>Câu chuyện làng nghề</h2>
          {village.description.map((paragraph) => (
            <p className="craft-village-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="craft-village-detail__card">
          <h2>Điểm nổi bật</h2>
          <ul className="craft-village-detail__highlights">
            {village.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle-solid" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="craft-village-detail__card craft-village-detail__note">
          <h2>Lưu ý tham quan</h2>
          <p className="craft-village-detail__paragraph">
            {village.visitorNote}
          </p>
        </section>
        <ContentReviews targetType="craft-villages" targetId={village.id} title={village.name} />
      </main>
    </Page>
  );
}

export default CraftVillageDetailPage;
