import { useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { SpecialtyCategory, specialties } from "@/data/specialties";
import "../css/pages/specialties.css";

const filters: ("Tất cả" | SpecialtyCategory)[] = [
  "Tất cả",
  "Món ăn",
  "Trái cây",
  "Quà mang về",
];

function SpecialtiesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>(
    "Tất cả"
  );

  const visibleSpecialties =
    activeFilter === "Tất cả"
      ? specialties
      : specialties.filter((item) => item.category === activeFilter);

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
        <h1>Đặc sản</h1>
      </header>

      <main className="specialties-content">
        <div className="specialties-filters">
          {filters.map((filter) => (
            <button
              className={`specialties-filter${
                filter === activeFilter ? " specialties-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="specialties-list">
          {visibleSpecialties.map((item) => (
            <button
              className="specialty-card"
              key={item.id}
              type="button"
              onClick={() => navigate(`/specialties/${item.id}`)}
            >
              <div className="specialty-card__image">
                <img src={item.image} alt="" />
              </div>

              <div className="specialty-card__body">
                <span className="specialty-card__category">
                  {item.category}
                </span>
                <h2>{item.name}</h2>
                <p className="specialty-card__price">
                  <Icon icon="zi-note" />
                  {item.price}
                </p>
                <p className="specialty-card__summary">{item.summary}</p>
              </div>

              <Icon className="specialty-card__arrow" icon="zi-chevron-right" />
            </button>
          ))}
        </div>
      </main>
    </Page>
  );
}

export default SpecialtiesPage;
