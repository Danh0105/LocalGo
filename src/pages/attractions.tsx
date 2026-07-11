import { useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { AttractionCategory, attractions } from "@/data/attractions";
import "../css/pages/attractions.css";

const filters: ("Tất cả" | AttractionCategory)[] = [
  "Tất cả",
  "Sinh thái",
  "Trải nghiệm",
  "Check-in",
];

function AttractionsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>(
    "Tất cả"
  );

  const visibleAttractions =
    activeFilter === "Tất cả"
      ? attractions
      : attractions.filter((item) => item.category === activeFilter);

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
        <h1>Điểm du lịch</h1>
      </header>

      <main className="attractions-content">
        <div className="attractions-filters">
          {filters.map((filter) => (
            <button
              className={`attractions-filter${
                filter === activeFilter ? " attractions-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="attractions-list">
          {visibleAttractions.map((item) => (
            <button
              className="attraction-card"
              key={item.id}
              type="button"
              onClick={() => navigate(`/attractions/${item.id}`)}
            >
              <div className="attraction-card__image">
                <img src={item.image} alt="" />
              </div>

              <div className="attraction-card__body">
                <span className="attraction-card__category">
                  {item.category}
                </span>
                <h2>{item.name}</h2>
                <p className="attraction-card__address">
                  <Icon icon="zi-location" />
                  {item.address}
                </p>
                <p className="attraction-card__summary">{item.summary}</p>
              </div>

              <Icon
                className="attraction-card__arrow"
                icon="zi-chevron-right"
              />
            </button>
          ))}
        </div>
      </main>
    </Page>
  );
}

export default AttractionsPage;
