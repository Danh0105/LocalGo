import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import {
  ExperienceTour,
  ExperienceTourCategory,
} from "@/data/experience-tours";
import { getExperienceTours } from "@/services/experience-tours";
import "../css/pages/experience-tours.css";

type ExperienceTourFilter = "Tất cả" | ExperienceTourCategory;

const filters: ExperienceTourFilter[] = [
  "Tất cả",
  "Nửa ngày",
  "Một ngày",
  "Gia đình",
  "Học sinh",
  "Nông nghiệp",
];

function ExperienceToursPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] =
    useState<ExperienceTourFilter>("Tất cả");
  const [tours, setTours] = useState<ExperienceTour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getExperienceTours({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setTours(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải danh sách tour trải nghiệm.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

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
        <div>
          <span>Lịch trình gợi ý</span>
          <h1>Tour trải nghiệm</h1>
        </div>
      </header>

      <main className="experience-tours-content">
        <section className="experience-tours-intro">
          <p>
            Gợi ý các lịch trình tham quan, làm nghề, trải nghiệm nông nghiệp và
            khám phá đời sống địa phương tại xã Truông Mít.
          </p>
        </section>

        <div className="experience-tours-filters">
          {filters.map((filter) => (
            <button
              className={`experience-tours-filter${
                filter === activeFilter
                  ? " experience-tours-filter--active"
                  : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {isLoading && (
          <p className="experience-tours-status">Đang tải dữ liệu...</p>
        )}
        {!isLoading && error && (
          <p className="experience-tours-status experience-tours-status--error">
            {error}
          </p>
        )}
        {!isLoading && !error && tours.length === 0 && (
          <p className="experience-tours-status">
            Chưa có tour trong nhóm này.
          </p>
        )}

        {!isLoading && !error && (
          <section className="experience-tours-list">
            {tours.map((tour) => (
              <button
                className="experience-tour-card"
                key={tour.id}
                type="button"
                onClick={() => navigate(`/experience-tours/${tour.id}`)}
              >
                <div className="experience-tour-card__image">
                  <img src={tour.image} alt="" />
                </div>
                <div className="experience-tour-card__body">
                  <span className="experience-tour-card__category">
                    {tour.category}
                  </span>
                  <h2>{tour.name}</h2>
                  <p className="experience-tour-card__duration">
                    <Icon icon="zi-clock-1" />
                    <span>{tour.duration}</span>
                  </p>
                  <p className="experience-tour-card__summary">
                    {tour.summary}
                  </p>
                </div>
                <Icon
                  className="experience-tour-card__arrow"
                  icon="zi-chevron-right"
                />
              </button>
            ))}
          </section>
        )}
      </main>
    </Page>
  );
}

export default ExperienceToursPage;
