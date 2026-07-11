import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { AgricultureItem } from "@/data/agriculture";
import { getAgricultureItemById } from "@/services/agriculture";
import "../css/pages/agriculture.css";

function AgricultureDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<AgricultureItem>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setItem(undefined);
      setIsLoading(false);
      return;
    }

    getAgricultureItemById(id).then((data) => {
      if (!isActive) return;
      setItem(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="agriculture-page">
        <p className="agriculture-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!item) {
    return (
      <Page className="agriculture-page">
        <header className="agriculture-header">
          <button
            className="agriculture-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>Không tìm thấy dữ liệu</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="agriculture-page">
      <section className="agriculture-detail__hero">
        <img src={item.image} alt="" />
        <button
          className="agriculture-back agriculture-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="agriculture-detail__content">
        <section className="agriculture-detail__card">
          <span className="agriculture-card__category">{item.category}</span>
          <h1>{item.name}</h1>
          <ul className="agriculture-detail__meta">
            <li>
              <Icon icon="zi-location" />
              <span>{item.location}</span>
            </li>
            <li>
              <Icon icon="zi-calendar" />
              <span>{item.season}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{item.scale}</span>
            </li>
          </ul>
        </section>

        <section className="agriculture-detail__card">
          <h2>Thông tin mô hình</h2>
          {item.description.map((paragraph) => (
            <p className="agriculture-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="agriculture-detail__card">
          <h2>Điểm nổi bật</h2>
          <ul className="agriculture-detail__highlights">
            {item.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle-solid" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="agriculture-detail__card agriculture-detail__support">
          <h2>Hỗ trợ người dân</h2>
          <p className="agriculture-detail__paragraph">{item.support}</p>
        </section>
      </main>
    </Page>
  );
}

export default AgricultureDetailPage;
