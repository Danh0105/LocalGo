import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import {
  HistoricalSite,
  HistoricalSiteRank,
} from "@/data/historical-sites";
import { getHistoricalSites } from "@/services/historical-sites";
import "../css/pages/historical-sites.css";

type SiteFilter = "Tất cả" | HistoricalSiteRank;

const filters: SiteFilter[] = [
  "Tất cả",
  "Cấp quốc gia",
  "Cấp tỉnh",
  "Chưa xếp hạng",
];

function HistoricalSitesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<SiteFilter>("Tất cả");
  const [sites, setSites] = useState<HistoricalSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getHistoricalSites({
      rank: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setSites(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải danh sách di tích.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

  return (
    <Page className="historical-sites-page">
      <header className="historical-sites-header">
        <button
          className="historical-sites-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Khám phá quê hương</span>
          <h1>Di tích lịch sử</h1>
        </div>
      </header>

      <main className="historical-sites-content">
        <div className="historical-sites-filters">
          {filters.map((filter) => (
            <button
              className={`historical-sites-filter${
                filter === activeFilter
                  ? " historical-sites-filter--active"
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
          <p className="historical-sites-status">Đang tải dữ liệu...</p>
        )}
        {!isLoading && error && (
          <p className="historical-sites-status historical-sites-status--error">
            {error}
          </p>
        )}
        {!isLoading && !error && sites.length === 0 && (
          <p className="historical-sites-status">
            Chưa có di tích trong nhóm này.
          </p>
        )}

        {!isLoading && !error && (
          <section className="historical-sites-list">
            {sites.map((site) => (
              <button
                className="historical-site-card"
                key={site.id}
                type="button"
                onClick={() => navigate(`/historical-sites/${site.id}`)}
              >
                <div className="historical-site-card__image">
                  <img src={site.image} alt="" />
                </div>
                <div className="historical-site-card__body">
                  <span className="historical-site-card__rank">
                    {site.rank}
                  </span>
                  <h2>{site.name}</h2>
                  <p className="historical-site-card__address">
                    <Icon icon="zi-location" />
                    <span>{site.address}</span>
                  </p>
                  <p className="historical-site-card__summary">
                    {site.summary}
                  </p>
                </div>
                <Icon
                  className="historical-site-card__arrow"
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

export default HistoricalSitesPage;
