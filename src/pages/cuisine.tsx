import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { CuisineCategory, CuisineItem } from "@/data/cuisine";
import { getCuisineItems } from "@/services/cuisine";
import "../css/pages/cuisine.css";

type CuisineFilter = "Tất cả" | CuisineCategory;

const filters: CuisineFilter[] = [
  "Tất cả",
  "Món nước",
  "Món nướng",
  "Món cuốn",
  "Ăn vặt",
  "Món chay",
];

function CuisinePage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<CuisineFilter>("Tất cả");
  const [items, setItems] = useState<CuisineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getCuisineItems({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setItems(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải danh sách món ăn.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

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
        <div>
          <span>Ăn gì hôm nay</span>
          <h1>Ẩm thực</h1>
        </div>
      </header>

      <main className="cuisine-content">
        <section className="cuisine-intro">
          <p>
            Gợi ý món ăn, điểm dùng bữa và mẹo thưởng thức ẩm thực địa phương
            tại xã Truông Mít.
          </p>
        </section>

        <div className="cuisine-filters">
          {filters.map((filter) => (
            <button
              className={`cuisine-filter${
                filter === activeFilter ? " cuisine-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {isLoading && <p className="cuisine-status">Đang tải dữ liệu...</p>}
        {!isLoading && error && (
          <p className="cuisine-status cuisine-status--error">{error}</p>
        )}
        {!isLoading && !error && items.length === 0 && (
          <p className="cuisine-status">Chưa có món ăn trong nhóm này.</p>
        )}

        {!isLoading && !error && (
          <section className="cuisine-list">
            {items.map((item) => (
              <button
                className="cuisine-card"
                key={item.id}
                type="button"
                onClick={() => navigate(`/cuisine/${item.id}`)}
              >
                <div className="cuisine-card__image">
                  <img src={item.image} alt="" />
                </div>
                <div className="cuisine-card__body">
                  <span className="cuisine-card__category">
                    {item.category}
                  </span>
                  <h2>{item.name}</h2>
                  <p className="cuisine-card__price">
                    <Icon icon="zi-note" />
                    <span>{item.priceRange}</span>
                  </p>
                  <p className="cuisine-card__summary">{item.summary}</p>
                </div>
                <Icon className="cuisine-card__arrow" icon="zi-chevron-right" />
              </button>
            ))}
          </section>
        )}
      </main>
    </Page>
  );
}

export default CuisinePage;
