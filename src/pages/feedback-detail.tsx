import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { FeedbackChannel } from "@/data/feedback";
import { getFeedbackChannelById } from "@/services/feedback";
import "../css/pages/feedback.css";

function FeedbackDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [channel, setChannel] = useState<FeedbackChannel>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setChannel(undefined);
      setIsLoading(false);
      return;
    }

    getFeedbackChannelById(id).then((data) => {
      if (!isActive) return;
      setChannel(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="feedback-page">
        <p className="feedback-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!channel) {
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
          <h1>Không tìm thấy phản hồi</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="feedback-page">
      <section className="feedback-detail__hero">
        <img src={channel.image} alt="" />
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
      </main>
    </Page>
  );
}

export default FeedbackDetailPage;
