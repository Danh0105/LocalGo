import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { NewsArticle, NewsCategory } from "@/data/news";
import { getNewsArticles } from "@/services/news";
import "../css/pages/news.css";

type NewsFilter = "Tất cả" | NewsCategory;

const filters: NewsFilter[] = [
  "Tất cả",
  "Thông báo",
  "Hoạt động xã",
  "Du lịch",
  "Nông nghiệp",
  "Chuyển đổi số",
];

function NewsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<NewsFilter>("Tất cả");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getNewsArticles({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setArticles(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải danh sách tin tức.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

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
        <div>
          <span>Cập nhật địa phương</span>
          <h1>Tin tức</h1>
        </div>
      </header>

      <main className="news-content">
        <section className="news-intro">
          <p>
            Theo dõi thông báo, hoạt động xã, tin du lịch, nông nghiệp và chuyển
            đổi số của xã Truông Mít.
          </p>
        </section>

        <div className="news-filters">
          {filters.map((filter) => (
            <button
              className={`news-filter${
                filter === activeFilter ? " news-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {isLoading && <p className="news-status">Đang tải dữ liệu...</p>}
        {!isLoading && error && (
          <p className="news-status news-status--error">{error}</p>
        )}
        {!isLoading && !error && articles.length === 0 && (
          <p className="news-status">Chưa có tin tức trong nhóm này.</p>
        )}

        {!isLoading && !error && (
          <section className="news-list">
            {articles.map((article) => (
              <button
                className="news-card"
                key={article.id}
                type="button"
                onClick={() => navigate(`/news/${article.id}`)}
              >
                <div className="news-card__image">
                  <img src={article.image} alt="" />
                </div>
                <div className="news-card__body">
                  <span className="news-card__category">
                    {article.category}
                  </span>
                  <h2>{article.title}</h2>
                  <p className="news-card__date">
                    <Icon icon="zi-calendar" />
                    <span>{article.publishedAt}</span>
                  </p>
                  <p className="news-card__summary">{article.summary}</p>
                </div>
                <Icon className="news-card__arrow" icon="zi-chevron-right" />
              </button>
            ))}
          </section>
        )}
      </main>
    </Page>
  );
}

export default NewsPage;
