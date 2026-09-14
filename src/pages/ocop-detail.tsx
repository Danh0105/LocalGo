import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import PreviewableImage from "@/components/previewable-image";
import { OcopProduct } from "@/data/ocop";
import { getOcopProductById } from "@/services/ocop";
import "../css/pages/ocop.css";

function OcopDetailStars({ rating }: { rating: number }) {
  return (
    <span className="ocop-stars ocop-detail__stars">
      {Array.from({ length: 5 }, (_, index) => (
        <Icon
          className={index < rating ? "ocop-stars__star--active" : ""}
          icon="zi-star-solid"
          key={index}
        />
      ))}
    </span>
  );
}

function OcopDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<OcopProduct>();
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
        setProduct(await getOcopProductById(id!, controller.signal));
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
      <Page className="ocop-page">
        <p className="ocop-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!product || error) {
    return (
      <Page className="ocop-page">
        <header className="ocop-header">
          <button
            className="ocop-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy sản phẩm"}</h1>
        </header>
        <main className="ocop-content">
          <p className="ocop-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Sản phẩm này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="ocop-detail__retry"
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
    <Page className="ocop-page">
      <section className="ocop-detail__hero">
        <PreviewableImage
          src={product.image}
          alt={product.name}
          previewTitle={product.name}
        />
        <button
          className="ocop-back ocop-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="ocop-detail__content">
        <section className="ocop-detail__card">
          <span className="ocop-card__category">{product.category}</span>
          <h1>{product.name}</h1>
          <OcopDetailStars rating={product.rating} />
          <ul className="ocop-detail__meta">
            <li>
              <Icon icon="zi-user" />
              <span>{product.producer}</span>
            </li>
            <li>
              <Icon icon="zi-location" />
              <span>{product.address}</span>
            </li>
            {product.contactPhone && (
              <li>
                <Icon icon="zi-call" />
                <a href={`tel:${product.contactPhone.replace(/[^\d+]/g, "")}`}>
                  {product.contactPhone}
                </a>
              </li>
            )}
            <li>
              <Icon icon="zi-note" />
              <span>{product.priceRange}</span>
            </li>
          </ul>
        </section>

        <section className="ocop-detail__card">
          <h2>Giới thiệu sản phẩm</h2>
          {product.description.map((paragraph) => (
            <p className="ocop-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="ocop-detail__card">
          <h2>Điểm nổi bật</h2>
          <ul className="ocop-detail__highlights">
            {product.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle-solid" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ocop-detail__card ocop-detail__note">
          <h2>Ghi chú kết nối</h2>
          <p className="ocop-detail__paragraph">{product.contactNote}</p>
        </section>
      </main>
    </Page>
  );
}

export default OcopDetailPage;
