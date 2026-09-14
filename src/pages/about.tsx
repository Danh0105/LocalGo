import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { AboutContent, getAbout } from "@/services/about";
import "../css/pages/about.css";

function AboutPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState<AboutContent>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not-found" | "request" | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    async function load(): Promise<void> {
      try {
        setContent(await getAbout(controller.signal));
      } catch (requestError: unknown) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error && requestError.message === "NOT_FOUND" ? "not-found" : "request");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retryKey]);

  if (isLoading) {
    return (
      <Page className="about-page">
        <p className="about-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!content || error) {
    return (
      <Page className="about-page">
        <section className="about-hero">
          <button
            className="about-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <div className="about-hero-title">Giới thiệu</div>
        </section>
        <main className="about-content">
          <p className="about-empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Nội dung giới thiệu chưa được xuất bản."}
          </p>
          {error === "request" && (
            <button
              className="about-retry"
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
            >
              Thử lại
            </button>
          )}
        </main>
      </Page>
    );
  }

  return (
    <Page className="about-page">
      <section
        className="about-hero"
        style={{ backgroundImage: `url(${content.heroImage})` }}
      >
        <button
          className="about-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div className="about-hero-title">{content.title}</div>
      </section>

      <main className="about-content">
        <section className="about-card about-intro">
          <h2 className="about-section-title">
            <span />
            {content.overviewTitle}
          </h2>
          {content.overviewParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>

        <div className="about-stats">
          {content.statistics.map((item) => (
            <div className="about-stat" key={item.id}>
              <strong>
                {item.value}
                {item.unit && <small> {item.unit}</small>}
              </strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <section className="about-card">
          <h2 className="about-section-title">
            <span />
            {content.highlightsSectionTitle}
          </h2>
          <div className="about-highlights">
            {content.highlights.map((item) => (
              <article className="about-highlight" key={item.id}>
                <img src={item.image} alt="" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-card">
          <h2 className="about-section-title">
            <span />
            {content.milestonesSectionTitle}
          </h2>
          <ul className="about-timeline">
            {content.milestones.map((item) => (
              <li key={item.id}>
                <span className="about-timeline-year">{item.year}</span>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Page>
  );
}

export default AboutPage;
