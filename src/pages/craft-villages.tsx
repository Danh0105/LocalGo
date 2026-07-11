import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { CraftVillage, CraftVillageCategory } from "@/data/craft-villages";
import { getCraftVillages } from "@/services/craft-villages";
import "../css/pages/craft-villages.css";

type CraftVillageFilter = "Tất cả" | CraftVillageCategory;

const filters: CraftVillageFilter[] = [
  "Tất cả",
  "Thủ công truyền thống",
  "Chế biến nông sản",
  "Dịch vụ trải nghiệm",
  "Sản phẩm gia đình",
];

function CraftVillagesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] =
    useState<CraftVillageFilter>("Tất cả");
  const [villages, setVillages] = useState<CraftVillage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getCraftVillages({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setVillages(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải danh sách làng nghề.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

  return (
    <Page className="craft-villages-page">
      <header className="craft-villages-header">
        <button
          className="craft-villages-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Nét nghề địa phương</span>
          <h1>Làng nghề</h1>
        </div>
      </header>

      <main className="craft-villages-content">
        <section className="craft-villages-intro">
          <p>
            Khám phá các nghề thủ công, chế biến nông sản và hoạt động trải
            nghiệm gắn với đời sống người dân xã Truông Mít.
          </p>
        </section>

        <div className="craft-villages-filters">
          {filters.map((filter) => (
            <button
              className={`craft-villages-filter${
                filter === activeFilter
                  ? " craft-villages-filter--active"
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
          <p className="craft-villages-status">Đang tải dữ liệu...</p>
        )}
        {!isLoading && error && (
          <p className="craft-villages-status craft-villages-status--error">
            {error}
          </p>
        )}
        {!isLoading && !error && villages.length === 0 && (
          <p className="craft-villages-status">
            Chưa có làng nghề trong nhóm này.
          </p>
        )}

        {!isLoading && !error && (
          <section className="craft-villages-list">
            {villages.map((village) => (
              <button
                className="craft-village-card"
                key={village.id}
                type="button"
                onClick={() => navigate(`/craft-villages/${village.id}`)}
              >
                <div className="craft-village-card__image">
                  <img src={village.image} alt="" />
                </div>
                <div className="craft-village-card__body">
                  <span className="craft-village-card__category">
                    {village.category}
                  </span>
                  <h2>{village.name}</h2>
                  <p className="craft-village-card__address">
                    <Icon icon="zi-location" />
                    <span>{village.address}</span>
                  </p>
                  <p className="craft-village-card__summary">
                    {village.summary}
                  </p>
                </div>
                <Icon
                  className="craft-village-card__arrow"
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

export default CraftVillagesPage;
