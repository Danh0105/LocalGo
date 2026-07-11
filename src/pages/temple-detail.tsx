import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { temples } from "@/data/temples";
import "../css/pages/temples.css";

function TempleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const temple = temples.find((item) => item.id === id);

  if (!temple) {
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
          <h1>Không tìm thấy</h1>
        </header>
        <main className="temples-content">
          <p className="temple-detail__empty">
            Địa điểm này không tồn tại hoặc đã bị xóa.
          </p>
        </main>
      </Page>
    );
  }

  return (
    <Page className="temples-page">
      <section className="temple-detail__hero">
        <img src={temple.image} alt={temple.name} />
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
          <ul className="temple-detail__events">
            {temple.events.map((event) => (
              <li key={event.name}>
                <span className="temple-detail__event-time">{event.time}</span>
                <span>{event.name}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Page>
  );
}

export default TempleDetailPage;
