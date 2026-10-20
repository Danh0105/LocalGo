import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import ContentGallery from "@/components/content-gallery";
import { HistoricalSite } from "@/data/historical-sites";
import { getHistoricalSiteById } from "@/services/historical-sites";
import "../css/pages/historical-sites.css";

function HistoricalSiteDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<HistoricalSite>();
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
        setSite(await getHistoricalSiteById(id!, controller.signal));
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
      <Page className="historical-sites-page">
        <p className="historical-sites-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!site || error) {
    return (
      <Page className="historical-sites-page">
        <header className="historical-sites-header">
          <button
            className="historical-sites-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy di tích"}</h1>
        </header>
        <main className="historical-sites-content">
          <p className="historical-site-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Di tích này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="historical-site-detail__retry"
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
    <Page className="historical-sites-page">
      <section className={`historical-site-detail__hero${site.galleryImages?.length ? " content-detail-hero--gallery" : ""}`}>
        <ContentGallery imageUrl={site.imageUrl} imageAlt={site.imageAlt} galleryImages={site.galleryImages} fallbackSrc={site.image} title={site.name} />
        <button
          className="historical-sites-back historical-site-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="historical-site-detail__content">
        <section className="historical-site-detail__card">
          <span className="historical-site-card__rank">{site.rank}</span>
          <h1>{site.name}</h1>
          <p className="historical-site-detail__meta">
            <Icon icon="zi-location" />
            <span>{site.address}</span>
          </p>
          {site.recognizedYear && (
            <p className="historical-site-detail__meta">
              <Icon icon="zi-calendar" />
              <span>Công nhận năm {site.recognizedYear}</span>
            </p>
          )}
          <DirectionsButton googleMapsUrl={site.googleMapsUrl} />
        </section>

        <section className="historical-site-detail__card">
          <h2>Lịch sử di tích</h2>
          {site.history.map((paragraph) => (
            <p className="historical-site-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="historical-site-detail__card">
          <h2>Điểm nổi bật</h2>
          <ul className="historical-site-detail__highlights">
            {site.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle-solid" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Page>
  );
}

export default HistoricalSiteDetailPage;
