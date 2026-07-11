import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { Festival, FestivalCategory } from "@/data/festivals";
import { getFestivals } from "@/services/festivals";
import "../css/pages/festivals.css";

type FestivalFilter = "Tất cả" | FestivalCategory;

const filters: FestivalFilter[] = [
  "Tất cả",
  "Lễ truyền thống",
  "Văn hóa cộng đồng",
  "Thể thao - vui chơi",
  "Sự kiện nông sản",
];

function FestivalsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FestivalFilter>("Tất cả");
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getFestivals({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setFestivals(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải danh sách lễ hội.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

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
        <div>
          <span>Sự kiện địa phương</span>
          <h1>Lễ hội</h1>
        </div>
      </header>

      <main className="festivals-content">
        <section className="festivals-intro">
          <p>
            Cập nhật lễ hội, ngày hội cộng đồng và các hoạt động văn hóa nổi
            bật của xã Truông Mít.
          </p>
        </section>

        <div className="festivals-filters">
          {filters.map((filter) => (
            <button
              className={`festivals-filter${
                filter === activeFilter ? " festivals-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {isLoading && <p className="festivals-status">Đang tải dữ liệu...</p>}
        {!isLoading && error && (
          <p className="festivals-status festivals-status--error">{error}</p>
        )}
        {!isLoading && !error && festivals.length === 0 && (
          <p className="festivals-status">Chưa có lễ hội trong nhóm này.</p>
        )}

        {!isLoading && !error && (
          <section className="festivals-list">
            {festivals.map((festival) => (
              <button
                className="festival-card"
                key={festival.id}
                type="button"
                onClick={() => navigate(`/festivals/${festival.id}`)}
              >
                <div className="festival-card__image">
                  <img src={festival.image} alt="" />
                </div>
                <div className="festival-card__body">
                  <span className="festival-card__category">
                    {festival.category}
                  </span>
                  <h2>{festival.name}</h2>
                  <p className="festival-card__time">
                    <Icon icon="zi-calendar" />
                    <span>{festival.time}</span>
                  </p>
                  <p className="festival-card__summary">{festival.summary}</p>
                </div>
                <Icon className="festival-card__arrow" icon="zi-chevron-right" />
              </button>
            ))}
          </section>
        )}
      </main>
    </Page>
  );
}

export default FestivalsPage;
