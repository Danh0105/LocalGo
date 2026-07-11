import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { CraftVillage } from "@/data/craft-villages";
import { getCraftVillageById } from "@/services/craft-villages";
import "../css/pages/craft-villages.css";

function CraftVillageDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [village, setVillage] = useState<CraftVillage>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setVillage(undefined);
      setIsLoading(false);
      return;
    }

    getCraftVillageById(id).then((data) => {
      if (!isActive) return;
      setVillage(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="craft-villages-page">
        <p className="craft-villages-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!village) {
    return (
      <Page className="craft-villages-page">
        <header className="craft-villages-header">
          <button
            className="craft-villages-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>Không tìm thấy làng nghề</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="craft-villages-page">
      <section className="craft-village-detail__hero">
        <img src={village.image} alt="" />
        <button
          className="craft-villages-back craft-village-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="craft-village-detail__content">
        <section className="craft-village-detail__card">
          <span className="craft-village-card__category">
            {village.category}
          </span>
          <h1>{village.name}</h1>
          <ul className="craft-village-detail__meta">
            <li>
              <Icon icon="zi-location" />
              <span>{village.address}</span>
            </li>
            <li>
              <Icon icon="zi-clock-1" />
              <span>{village.workingTime}</span>
            </li>
            <li>
              <Icon icon="zi-note" />
              <span>{village.mainProducts}</span>
            </li>
          </ul>
        </section>

        <section className="craft-village-detail__card">
          <h2>Câu chuyện làng nghề</h2>
          {village.description.map((paragraph) => (
            <p className="craft-village-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="craft-village-detail__card">
          <h2>Điểm nổi bật</h2>
          <ul className="craft-village-detail__highlights">
            {village.highlights.map((highlight) => (
              <li key={highlight}>
                <Icon icon="zi-check-circle-solid" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="craft-village-detail__card craft-village-detail__note">
          <h2>Lưu ý tham quan</h2>
          <p className="craft-village-detail__paragraph">
            {village.visitorNote}
          </p>
        </section>
      </main>
    </Page>
  );
}

export default CraftVillageDetailPage;
