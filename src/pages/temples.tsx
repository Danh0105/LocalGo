import ContentSourceTabs, {
  type ContentSource,
} from "@/components/trade/content-source-tabs";
import SectionTradePosts from "@/components/trade/section-trade-posts";
import ContentRating from "@/components/content-reviews/content-rating";
import { useContentRatings } from "@/hooks/use-content-ratings";
import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import templePlaceholder from "@/static/temple.png";
import { getHeritageDirectory, type HeritagePlace } from "@/services/heritage-directory";
import "../css/pages/temples.css";
import "@/css/pages/section-directory.css";

const filters = ["Tất cả", "Đình", "Chùa", "Miếu", "Di tích lịch sử", "Cấp quốc gia", "Cấp tỉnh", "Chưa xếp hạng"] as const;

function TemplesPage() {
  const navigate = useNavigate();
  const [contentSource, setContentSource] = useState<ContentSource>("all");
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]>("Tất cả");
  const [places, setPlaces] = useState<HeritagePlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");
    async function load(): Promise<void> {
      try {
        const data = await getHeritageDirectory(controller.signal);
        if (controller.signal.aborted) return;
        setPlaces(data.places);
        setError(data.failedSources.length ? `Chưa tải được: ${data.failedSources.join(", ")}.` : "");
      } catch (requestError: unknown) {
        if (controller.signal.aborted || (requestError instanceof DOMException && requestError.name === "AbortError")) return;
        setError("Không thể tải danh sách địa điểm. Vui lòng thử lại.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retryKey]);

  const templeRatings = useContentRatings("temples", places.flatMap((item) => item.sources.filter((source) => source.type === "temples")));
  const historicalRatings = useContentRatings("historical-sites", places.flatMap((item) => item.sources.filter((source) => source.type === "historical-sites")));
  const visiblePlaces = places.filter((item) => activeFilter === "Tất cả" || item.tags.includes(activeFilter));

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
        <h1>Đền - chùa - miếu & Di tích lịch sử</h1>
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
                aria-pressed={filter === activeFilter}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {isLoading && <p className="temples-status">Đang tải dữ liệu...</p>}
          {!isLoading && error && (
            <div className="temples-status temples-status--error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRetryKey((value) => value + 1)}
              >
                Thử lại
              </button>
            </div>
          )}
          {!isLoading && visiblePlaces.length === 0 && (!error || places.length > 0) && (
            <p className="temples-status">Chưa có địa điểm trong nhóm này.</p>
          )}

          {!isLoading && (
            <div className="temples-list">
              {visiblePlaces.map((item) => (
                <div key={item.key}>
                <button
                  className="temple-card"
                  type="button"
                  onClick={() => navigate(item.sources[0].detailPath)}
                >
                  <div className="temple-card__image">
                    <img
                      src={item.image || templePlaceholder}
                      alt={item.imageAlt || item.name}
                    />
                  </div>

                  <div className="temple-card__body">
                    <span className="temple-card__type">{item.tags.join(" · ")}</span>
                    <h2>{item.name}</h2>
                    <ContentRating rating={item.sources[0].type === "temples"
                      ? templeRatings[item.sources[0].id]
                      : historicalRatings[item.sources[0].id]} />
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
                {item.sources.slice(1).map((source) => (
                  <button
                    className="heritage-place__related"
                    key={`${source.type}:${source.id}`}
                    type="button"
                    onClick={() => navigate(source.detailPath)}
                    aria-label={`Xem hồ sơ ${source.type === "historical-sites" ? "di tích lịch sử" : "đền - chùa - miếu"}: ${item.name}`}
                  >
                    Xem hồ sơ {source.type === "historical-sites" ? "di tích lịch sử" : "đền - chùa - miếu"}
                    <Icon icon="zi-chevron-right" />
                  </button>
                ))}
                </div>
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
