import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { attractions } from "@/data/attractions";
import "../css/pages/attractions.css";

function AttractionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const attraction = attractions.find((item) => item.id === id);

  if (!attraction) {
    return (
      <Page className="attractions-page">
        <header className="attractions-header">
          <button
            className="attractions-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>Không tìm thấy</h1>
        </header>
        <main className="attractions-content">
          <p className="attraction-detail__empty">
            Điểm du lịch này không tồn tại hoặc đã bị xóa.
          </p>
        </main>
      </Page>
    );
  }

  return (
    <Page className="attractions-page">
      <section className="attraction-detail__hero">
        <img src={attraction.image} alt={attraction.name} />
        <button
          className="attractions-back attraction-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="attractions-content attraction-detail__content">
        <section className="attraction-detail__card">
          <span className="attraction-card__category">
            {attraction.category}
          </span>
          <h1 className="attraction-detail__name">{attraction.name}</h1>

          <ul className="attraction-detail__info">
            <li>
              <Icon icon="zi-location" />
              <span>{attraction.address}</span>
            </li>
            <li>
              <Icon icon="zi-clock-1" />
              <span>{attraction.openHours}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{attraction.ticket}</span>
            </li>
          </ul>
        </section>

        <section className="attraction-detail__card">
          <h2 className="attraction-detail__section-title">
            <span />
            Giới thiệu
          </h2>
          {attraction.description.map((paragraph) => (
            <p className="attraction-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="attraction-detail__card">
          <h2 className="attraction-detail__section-title">
            <span />
            Hoạt động nổi bật
          </h2>
          <ul className="attraction-detail__highlights">
            {attraction.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="attraction-detail__card attraction-detail__tip">
          <h2 className="attraction-detail__section-title">
            <span />
            Mẹo nhỏ
          </h2>
          <p className="attraction-detail__paragraph">{attraction.tip}</p>
        </section>
      </main>
    </Page>
  );
}

export default AttractionDetailPage;
