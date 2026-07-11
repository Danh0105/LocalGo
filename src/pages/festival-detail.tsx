import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { Festival } from "@/data/festivals";
import { getFestivalById } from "@/services/festivals";
import "../css/pages/festivals.css";

function FestivalDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [festival, setFestival] = useState<Festival>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setFestival(undefined);
      setIsLoading(false);
      return;
    }

    getFestivalById(id).then((data) => {
      if (!isActive) return;
      setFestival(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="festivals-page">
        <p className="festivals-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!festival) {
    return (
      <Page className="festivals-page">
        <header className="festivals-header">
          <button
            className="festivals-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>Không tìm thấy lễ hội</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="festivals-page">
      <section className="festival-detail__hero">
        <img src={festival.image} alt="" />
        <button
          className="festivals-back festival-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="festival-detail__content">
        <section className="festival-detail__card">
          <span className="festival-card__category">{festival.category}</span>
          <h1>{festival.name}</h1>
          <ul className="festival-detail__meta">
            <li>
              <Icon icon="zi-calendar" />
              <span>{festival.time}</span>
            </li>
            <li>
              <Icon icon="zi-location" />
              <span>{festival.location}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{festival.scale}</span>
            </li>
          </ul>
        </section>

        <section className="festival-detail__card">
          <h2>Giới thiệu lễ hội</h2>
          {festival.description.map((paragraph) => (
            <p className="festival-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="festival-detail__card">
          <h2>Hoạt động chính</h2>
          <ul className="festival-detail__activities">
            {festival.activities.map((activity) => (
              <li key={activity}>
                <Icon icon="zi-check-circle-solid" />
                <span>{activity}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="festival-detail__card festival-detail__note">
          <h2>Lưu ý</h2>
          <p className="festival-detail__paragraph">{festival.note}</p>
        </section>
      </main>
    </Page>
  );
}

export default FestivalDetailPage;
