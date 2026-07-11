import { FormEvent, useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { FeedbackCategory, FeedbackChannel } from "@/data/feedback";
import {
  getFeedbackChannels,
  submitFeedback,
} from "@/services/feedback";
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
  const [submitMessage, setSubmitMessage] = useState("");

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    submitFeedback({
      fullName: String(formData.get("fullName") || ""),
      phone: String(formData.get("phone") || ""),
      content: String(formData.get("content") || ""),
    }).then((result) => {
      setSubmitMessage(`Đã ghi nhận phản hồi mẫu: ${result.ticketCode}`);
      event.currentTarget.reset();
    });
  };

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
        <form className="feedback-form" onSubmit={handleSubmit}>
          <h2>Gửi phản hồi nhanh</h2>
          <label>
            Họ tên
            <input name="fullName" placeholder="Nhập họ tên" required />
          </label>
          <label>
            Số điện thoại
            <input name="phone" placeholder="Nhập số điện thoại" required />
          </label>
          <label>
            Nội dung
            <textarea
              name="content"
              placeholder="Nhập nội dung phản hồi"
              required
              rows={4}
            />
          </label>
          <button type="submit">
            <Icon icon="zi-send-solid" />
            <span>Gửi phản hồi</span>
          </button>
          {submitMessage && <p>{submitMessage}</p>}
        </form>

        <div className="feedback-filters">
          {filters.map((filter) => (
            <button
              className={`feedback-filter${
                filter === activeFilter ? " feedback-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
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
                  <img src={channel.image} alt="" />
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
                <Icon className="feedback-card__arrow" icon="zi-chevron-right" />
              </button>
            ))}
          </section>
        )}
      </main>
    </Page>
  );
}

export default FeedbackPage;
