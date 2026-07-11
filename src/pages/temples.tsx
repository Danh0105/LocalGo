import { useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { TempleType, temples } from "@/data/temples";
import "../css/pages/temples.css";

const filters: ("Tất cả" | TempleType)[] = ["Tất cả", "Đình", "Chùa", "Miếu"];

function TemplesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>(
    "Tất cả"
  );

  const visibleTemples =
    activeFilter === "Tất cả"
      ? temples
      : temples.filter((item) => item.type === activeFilter);

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
        <h1>Đền, Chùa - Miếu</h1>
      </header>

      <main className="temples-content">
        <div className="temples-filters">
          {filters.map((filter) => (
            <button
              className={`temples-filter${
                filter === activeFilter ? " temples-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="temples-list">
          {visibleTemples.map((item) => (
            <button
              className="temple-card"
              key={item.id}
              type="button"
              onClick={() => navigate(`/temples/${item.id}`)}
            >
              <div className="temple-card__image">
                <img src={item.image} alt="" />
              </div>

              <div className="temple-card__body">
                <span className="temple-card__type">{item.type}</span>
                <h2>{item.name}</h2>
                <p className="temple-card__address">
                  <Icon icon="zi-location" />
                  {item.address}
                </p>
                <p className="temple-card__summary">{item.summary}</p>
              </div>

              <Icon className="temple-card__arrow" icon="zi-chevron-right" />
            </button>
          ))}
        </div>
      </main>
    </Page>
  );
}

export default TemplesPage;
