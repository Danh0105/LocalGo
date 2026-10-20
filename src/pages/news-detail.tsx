import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import PreviewableImage from "@/components/previewable-image";
import { NewsArticle } from "@/data/news";
import { getNewsArticleById } from "@/services/news";
import "../css/pages/news.css";

function NewsDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsArticle>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not-found" | "request" | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    if (!id) {
      setError("not-found");
      setIsLoading(false);
      return () => controller.abort();
    }
    async function load(): Promise<void> {
      try {
        setArticle(await getNewsArticleById(id!, controller.signal));
      } catch (requestError: unknown) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error && requestError.message === "NOT_FOUND" ? "not-found" : "request");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [id, retryKey]);

  if (isLoading) {
    return (
      <Page className="news-page">
        <p className="news-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!article || error) {
    return (
      <Page className="news-page">
        <header className="news-header">
          <button
            className="news-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy tin tức"}</h1>
        </header>
        <main className="news-content">
          <p className="news-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Bài viết này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="news-detail__retry"
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
    <Page className="news-page">
      <section className="news-detail__hero">
        <PreviewableImage
          src={article.image}
          alt={article.title}
          previewTitle={article.title}
        />
        <button
          className="news-back news-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="news-detail__content">
        <article className="news-detail__card">
          <span className="news-card__category">{article.category}</span>
          <h1>{article.title}</h1>
          <ul className="news-detail__meta">
            <li>
              <Icon icon="zi-calendar" />
              <span>{article.publishedAt}</span>
            </li>
            <li>
              <Icon icon="zi-user" />
              <span>{article.author}</span>
            </li>
          </ul>
          <DirectionsButton googleMapsUrl={article.googleMapsUrl} />
        </article>

        <section className="news-detail__card">
          <h2>Nội dung</h2>
          {article.content.map((paragraph) => (
            <p className="news-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="news-detail__card">
          <h2>Từ khóa</h2>
          <div className="news-detail__tags">
            {article.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </section>

        <section className="news-detail__card news-detail__related">
          <h2>Liên quan</h2>
          <ul>
            {article.relatedLinks.map((link) => (
              <li key={link}>
                <Icon icon="zi-chevron-right" />
                <span>{link}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Page>
  );
}

export default NewsDetailPage;
