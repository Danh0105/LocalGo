import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

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

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setProduct(undefined);
      setIsLoading(false);
      return;
    }

    getOcopProductById(id).then((data) => {
      if (!isActive) return;
      setProduct(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="ocop-page">
        <p className="ocop-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!product) {
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
          <h1>Không tìm thấy sản phẩm</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="ocop-page">
      <section className="ocop-detail__hero">
        <img src={product.image} alt="" />
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
