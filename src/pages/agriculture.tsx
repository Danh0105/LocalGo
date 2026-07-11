import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { AgricultureCategory, AgricultureItem } from "@/data/agriculture";
import { getAgricultureItems } from "@/services/agriculture";
import "../css/pages/agriculture.css";

type AgricultureFilter = "Tất cả" | AgricultureCategory;

const filters: AgricultureFilter[] = [
  "Tất cả",
  "Cây trồng chủ lực",
  "Chăn nuôi",
  "Thủy lợi",
  "Mô hình sản xuất",
];

function AgriculturePage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] =
    useState<AgricultureFilter>("Tất cả");
  const [items, setItems] = useState<AgricultureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getAgricultureItems({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setItems(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải dữ liệu nông nghiệp.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

  return (
    <Page className="agriculture-page">
      <header className="agriculture-header">
        <button
          className="agriculture-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Sản xuất địa phương</span>
          <h1>Nông nghiệp</h1>
        </div>
      </header>

      <main className="agriculture-content">
        <section className="agriculture-intro">
          <p>
            Theo dõi cây trồng chủ lực, mô hình sản xuất, thủy lợi và chăn nuôi
            của xã Truông Mít.
          </p>
        </section>

        <div className="agriculture-filters">
          {filters.map((filter) => (
            <button
              className={`agriculture-filter${
                filter === activeFilter ? " agriculture-filter--active" : ""
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
          <p className="agriculture-status">Đang tải dữ liệu...</p>
        )}
        {!isLoading && error && (
          <p className="agriculture-status agriculture-status--error">
            {error}
          </p>
        )}
        {!isLoading && !error && items.length === 0 && (
          <p className="agriculture-status">
            Chưa có dữ liệu trong nhóm này.
          </p>
        )}

        {!isLoading && !error && (
          <section className="agriculture-list">
            {items.map((item) => (
              <button
                className="agriculture-card"
                key={item.id}
                type="button"
                onClick={() => navigate(`/agriculture/${item.id}`)}
              >
                <div className="agriculture-card__image">
                  <img src={item.image} alt="" />
                </div>
                <div className="agriculture-card__body">
                  <span className="agriculture-card__category">
                    {item.category}
                  </span>
                  <h2>{item.name}</h2>
                  <p className="agriculture-card__location">
                    <Icon icon="zi-location" />
                    <span>{item.location}</span>
                  </p>
                  <p className="agriculture-card__summary">{item.summary}</p>
                </div>
                <Icon
                  className="agriculture-card__arrow"
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

export default AgriculturePage;
