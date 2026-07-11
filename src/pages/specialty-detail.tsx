import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { specialties } from "@/data/specialties";
import "../css/pages/specialties.css";

function SpecialtyDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const specialty = specialties.find((item) => item.id === id);

  if (!specialty) {
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
          <h1>Không tìm thấy</h1>
        </header>
        <main className="specialties-content">
          <p className="specialty-detail__empty">
            Đặc sản này không tồn tại hoặc đã bị xóa.
          </p>
        </main>
      </Page>
    );
  }

  return (
    <Page className="specialties-page">
      <section className="specialty-detail__hero">
        <img src={specialty.image} alt={specialty.name} />
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
