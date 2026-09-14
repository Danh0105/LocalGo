import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import PreviewableImage from "@/components/previewable-image";
import { FeedbackChannel } from "@/data/feedback";
import { getFeedbackChannelById } from "@/services/feedback";
import "../css/pages/feedback.css";

function FeedbackDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [channel, setChannel] = useState<FeedbackChannel>();
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
        setChannel(await getFeedbackChannelById(id!, controller.signal));
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
      <Page className="feedback-page">
        <p className="feedback-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!channel || error) {
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
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy phản hồi"}</h1>
        </header>
        <main className="feedback-content">
          <p className="feedback-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Kênh phản hồi này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="feedback-detail__retry"
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
    <Page className="feedback-page">
      <section className="feedback-detail__hero">
        <PreviewableImage
          src={channel.image}
          alt={channel.imageAlt}
          previewTitle={channel.title}
        />
        <button
          className="feedback-back feedback-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="feedback-detail__content">
        <section className="feedback-detail__card">
          <span className="feedback-card__category">{channel.category}</span>
          <h1>{channel.title}</h1>
          <p className="feedback-detail__response">
            <Icon icon="zi-clock-1" />
            <span>{channel.responseTime}</span>
          </p>
        </section>

        <section className="feedback-detail__card">
          <h2>Thông tin kênh phản hồi</h2>
          {channel.description.map((paragraph) => (
            <p className="feedback-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="feedback-detail__card">
          <h2>Thông tin nên cung cấp</h2>
          <ul className="feedback-detail__list">
            {channel.requiredInfo.map((item) => (
              <li key={item}>
                <Icon icon="zi-check-circle-solid" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="feedback-detail__card">
          <h2>Ví dụ nội dung</h2>
          <ul className="feedback-detail__list">
            {channel.examples.map((item) => (
              <li key={item}>
                <Icon icon="zi-note" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="feedback-detail__card feedback-detail__note">
          <h2>Lưu ý</h2>
          <p className="feedback-detail__paragraph">{channel.note}</p>
        </section>

        <button
          className="feedback-cta"
          type="button"
          onClick={() => navigate(`/feedback/send?channelId=${channel.id}`)}
        >
          <Icon icon="zi-send-solid" />
          <span>Gửi phản hồi</span>
        </button>
      </main>
    </Page>
  );
}

export default FeedbackDetailPage;
