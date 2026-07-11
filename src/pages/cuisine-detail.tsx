import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { CuisineItem } from "@/data/cuisine";
import { getCuisineItemById } from "@/services/cuisine";
import "../css/pages/cuisine.css";

function CuisineDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<CuisineItem>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setItem(undefined);
      setIsLoading(false);
      return;
    }

    getCuisineItemById(id).then((data) => {
      if (!isActive) return;
      setItem(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="cuisine-page">
        <p className="cuisine-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!item) {
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
          <h1>Không tìm thấy món ăn</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="cuisine-page">
      <section className="cuisine-detail__hero">
        <img src={item.image} alt="" />
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
