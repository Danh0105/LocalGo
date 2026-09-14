import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { FeedbackCategory, FeedbackChannel } from "@/data/feedback";
import { getFeedbackChannels } from "@/services/feedback";
import "../css/pages/feedback.css";

type FeedbackFilter = "Tất cả" | FeedbackCategory;

const filters: FeedbackFilter[] = [
  "Tất cả",
  "Góp ý chung",
  "Phản ánh hạ tầng",
  "Dịch vụ công",
  "Du lịch",
  "Mini App",
];

function FeedbackPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FeedbackFilter>("Tất cả");
  const [channels, setChannels] = useState<FeedbackChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getFeedbackChannels({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setChannels(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải danh sách phản hồi.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

  return (
    <Page className="feedback-page">
      <header className="feedback-header">
        <button
          className="feedback-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Lắng nghe người dân</span>
          <h1>Phản hồi</h1>
        </div>
      </header>

      <main className="feedback-content">
        <div className="feedback-cta-row">
          <button
            className="feedback-cta"
            type="button"
            onClick={() => navigate("/feedback/send")}
          >
            <Icon icon="zi-send-solid" />
            <span>Gửi phản hồi mới</span>
          </button>
          <button
            className="feedback-cta feedback-cta--outline"
            type="button"
            onClick={() => navigate("/feedback/lookup")}
          >
            <Icon icon="zi-search" />
            <span>Tra cứu phản hồi</span>
          </button>
        </div>

        {isLoading && <p className="feedback-status">Đang tải dữ liệu...</p>}
        {!isLoading && error && (
          <p className="feedback-status feedback-status--error">{error}</p>
        )}
        {!isLoading && !error && channels.length === 0 && (
          <p className="feedback-status">
            Chưa có kênh phản hồi trong nhóm này.
          </p>
        )}

        {!isLoading && !error && (
          <section className="feedback-list">
            {channels.map((channel) => (
              <button
                className="feedback-card"
                key={channel.id}
                type="button"
                onClick={() => navigate(`/feedback/${channel.id}`)}
              >
                <div className="feedback-card__image">
                  <img src={channel.image} alt={channel.imageAlt} />
                </div>
                <div className="feedback-card__body">
                  <span className="feedback-card__category">
                    {channel.category}
                  </span>
                  <h2>{channel.title}</h2>
                  <p className="feedback-card__time">
                    <Icon icon="zi-clock-1" />
                    <span>{channel.responseTime}</span>
                  </p>
                  <p className="feedback-card__summary">{channel.summary}</p>
                </div>
                <Icon
                  className="feedback-card__arrow"
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

export default FeedbackPage;
