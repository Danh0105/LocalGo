import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { NewsArticle } from "@/data/news";
import { getNewsArticleById } from "@/services/news";
import "../css/pages/news.css";

function NewsDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsArticle>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setArticle(undefined);
      setIsLoading(false);
      return;
    }

    getNewsArticleById(id).then((data) => {
      if (!isActive) return;
      setArticle(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="news-page">
        <p className="news-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!article) {
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
          <h1>Không tìm thấy tin tức</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="news-page">
      <section className="news-detail__hero">
        <img src={article.image} alt="" />
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
