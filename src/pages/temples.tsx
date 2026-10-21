import ContentSourceTabs, {
  type ContentSource,
} from "@/components/trade/content-source-tabs";
import SectionTradePosts from "@/components/trade/section-trade-posts";
import ContentRating from "@/components/content-reviews/content-rating";
import { useContentRatings } from "@/hooks/use-content-ratings";
import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import templePlaceholder from "@/static/temple.png";
import { getTemples, TempleListItem, TempleType } from "@/services/temples";
import "../css/pages/temples.css";
import "@/css/pages/section-directory.css";

const filters: ("Tất cả" | TempleType)[] = ["Tất cả", "Đình", "Chùa", "Miếu"];

function TemplesPage() {
  const navigate = useNavigate();
  const [contentSource, setContentSource] = useState<ContentSource>("all");
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]>("Tất cả");
  const [temples, setTemples] = useState<TempleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");
    async function load(): Promise<void> {
      try {
        const data = await getTemples(
          activeFilter === "Tất cả" ? undefined : activeFilter,
          controller.signal,
        );
        setTemples(data);
      } catch (requestError: unknown) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )
          return;
        setError("Không thể tải danh sách địa điểm. Vui lòng thử lại.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [activeFilter, retryKey]);

  const ratings = useContentRatings("temples", temples);

  return (
    <Page className="temples-page section-directory-page">
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
        <ContentSourceTabs value={contentSource} onChange={setContentSource} />
        <div
          className="section-directory__editorial"
          hidden={contentSource === "trade"}
        >
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

          {isLoading && <p className="temples-status">Đang tải dữ liệu...</p>}
          {!isLoading && error && (
            <div className="temples-status temples-status--error">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRetryKey((value) => value + 1)}
              >
                Thử lại
              </button>
            </div>
          )}
          {!isLoading && !error && temples.length === 0 && (
            <p className="temples-status">Chưa có địa điểm trong nhóm này.</p>
          )}

          {!isLoading && !error && (
            <div className="temples-list">
              {temples.map((item) => (
                <button
                  className="temple-card"
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/temples/${item.id}`)}
                >
                  <div className="temple-card__image">
                    <img
                      src={item.imageUrl || templePlaceholder}
                      alt={item.imageAlt || item.name}
                    />
                  </div>

                  <div className="temple-card__body">
                    <span className="temple-card__type">{item.type}</span>
                    <h2>{item.name}</h2>
                    <ContentRating rating={ratings[item.id]} />
                    <p className="temple-card__address">
                      <Icon icon="zi-location" />
                      {item.address}
                    </p>
                    <p className="temple-card__summary">{item.summary}</p>
                  </div>

                  <Icon
                    className="temple-card__arrow"
                    icon="zi-chevron-right"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div
          className="section-directory__market"
          hidden={contentSource === "editorial"}
        >
          <SectionTradePosts section="temples" />
        </div>
      </main>
    </Page>
  );
}

export default TemplesPage;
