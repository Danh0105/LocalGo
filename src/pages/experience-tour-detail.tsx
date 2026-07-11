import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { ExperienceTour } from "@/data/experience-tours";
import { getExperienceTourById } from "@/services/experience-tours";
import "../css/pages/experience-tours.css";

function ExperienceTourDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tour, setTour] = useState<ExperienceTour>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setTour(undefined);
      setIsLoading(false);
      return;
    }

    getExperienceTourById(id).then((data) => {
      if (!isActive) return;
      setTour(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="experience-tours-page">
        <p className="experience-tours-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!tour) {
    return (
      <Page className="experience-tours-page">
        <header className="experience-tours-header">
          <button
            className="experience-tours-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>Không tìm thấy tour</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="experience-tours-page">
      <section className="experience-tour-detail__hero">
        <img src={tour.image} alt="" />
        <button
          className="experience-tours-back experience-tour-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="experience-tour-detail__content">
        <section className="experience-tour-detail__card">
          <span className="experience-tour-card__category">
            {tour.category}
          </span>
          <h1>{tour.name}</h1>
          <ul className="experience-tour-detail__meta">
            <li>
              <Icon icon="zi-clock-1" />
              <span>{tour.duration}</span>
            </li>
            <li>
              <Icon icon="zi-calendar" />
              <span>{tour.startTime}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{tour.priceRange}</span>
            </li>
            <li>
              <Icon icon="zi-location" />
              <span>{tour.meetingPoint}</span>
            </li>
          </ul>
        </section>

        <section className="experience-tour-detail__card">
          <h2>Giới thiệu tour</h2>
          {tour.description.map((paragraph) => (
            <p className="experience-tour-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="experience-tour-detail__card">
          <h2>Lịch trình dự kiến</h2>
          <ol className="experience-tour-detail__timeline">
            {tour.itinerary.map((item) => (
              <li key={item}>
                <span />
                <p>{item}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="experience-tour-detail__card">
          <h2>Bao gồm</h2>
          <ul className="experience-tour-detail__included">
            {tour.included.map((item) => (
              <li key={item}>
                <Icon icon="zi-check-circle-solid" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="experience-tour-detail__card experience-tour-detail__note">
          <h2>Lưu ý đặt tour</h2>
          <p className="experience-tour-detail__paragraph">{tour.note}</p>
        </section>
      </main>
    </Page>
  );
}

export default ExperienceTourDetailPage;
