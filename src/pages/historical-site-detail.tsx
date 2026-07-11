import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { HistoricalSite } from "@/data/historical-sites";
import { getHistoricalSiteById } from "@/services/historical-sites";
import "../css/pages/historical-sites.css";

function HistoricalSiteDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<HistoricalSite>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setSite(undefined);
      setIsLoading(false);
      return;
    }

    getHistoricalSiteById(id).then((data) => {
      if (!isActive) return;
      setSite(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="historical-sites-page">
        <p className="historical-sites-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!site) {
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
          <h1>Không tìm thấy di tích</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="historical-sites-page">
      <section className="historical-site-detail__hero">
        <img src={site.image} alt="" />
        <button
          className="historical-sites-back historical-site-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="historical-site-detail__content">
        <section className="historical-site-detail__card">
          <span className="historical-site-card__rank">{site.rank}</span>
          <h1>{site.name}</h1>
          <p className="historical-site-detail__meta">
            <Icon icon="zi-location" />
            <span>{site.address}</span>
          </p>
          {site.recognizedYear && (
            <p className="historical-site-detail__meta">
              <Icon icon="zi-calendar" />
              <span>Công nhận năm {site.recognizedYear}</span>
            </p>
          )}
        </section>

        <section className="historical-site-detail__card">
          <h2>Lịch sử di tích</h2>
          {site.history.map((paragraph) => (
            <p className="historical-site-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="historical-site-detail__card">
          <h2>Điểm nổi bật</h2>
          <ul className="historical-site-detail__highlights">
            {site.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle-solid" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Page>
  );
}

export default HistoricalSiteDetailPage;
