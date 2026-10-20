import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import DirectionsButton from "@/components/directions-button";
import ContentGallery from "@/components/content-gallery";
import { ContactItem } from "@/data/contacts";
import { getContactById } from "@/services/contacts";
import "../css/pages/contacts.css";

function ContactDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<ContactItem>();
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
        setContact(await getContactById(id!, controller.signal));
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
      <Page className="contacts-page">
        <p className="contacts-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!contact || error) {
    return (
      <Page className="contacts-page">
        <header className="contacts-header">
          <button
            className="contacts-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>{error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy liên hệ"}</h1>
        </header>
        <main className="contacts-content">
          <p className="contact-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Liên hệ này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>
          {error === "request" && (
            <button
              className="contact-detail__retry"
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
    <Page className="contacts-page">
      <section className={`contact-detail__hero${contact.galleryImages?.length ? " content-detail-hero--gallery" : ""}`}>
        <ContentGallery imageUrl={contact.imageUrl} imageAlt={contact.imageAlt} galleryImages={contact.galleryImages} fallbackSrc={contact.image} title={contact.name} />
        <button
          className="contacts-back contact-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="contact-detail__content">
        <section className="contact-detail__card">
          <span className="contact-card__category">{contact.category}</span>
          <h1>{contact.name}</h1>
          <p className="contact-detail__role">{contact.role}</p>
          <ul className="contact-detail__meta">
            <li>
              <Icon icon="zi-call" />
              <span>{contact.phone}</span>
            </li>
            {contact.email && (
              <li>
                <Icon icon="zi-chat" />
                <span>{contact.email}</span>
              </li>
            )}
            <li>
              <Icon icon="zi-location" />
              <span>{contact.address}</span>
            </li>
            <li>
              <Icon icon="zi-clock-1" />
              <span>{contact.workingTime}</span>
            </li>
          </ul>
          <DirectionsButton googleMapsUrl={contact.googleMapsUrl} />
        </section>

        <section className="contact-detail__actions">
          <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
            <Icon icon="zi-call-solid" />
            <span>Gọi ngay</span>
          </a>
          {contact.email && (
            <a href={`mailto:${contact.email}`}>
              <Icon icon="zi-chat-solid" />
              <span>Gửi email</span>
            </a>
          )}
        </section>

        <section className="contact-detail__card">
          <h2>Thông tin hỗ trợ</h2>
          {contact.description.map((paragraph) => (
            <p className="contact-detail__paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="contact-detail__card">
          <h2>Nội dung hỗ trợ</h2>
          <ul className="contact-detail__topics">
            {contact.supportTopics.map((topic) => (
              <li key={topic}>
                <Icon icon="zi-check-circle-solid" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="contact-detail__card contact-detail__note">
          <h2>Lưu ý</h2>
          <p className="contact-detail__paragraph">{contact.note}</p>
        </section>
      </main>
    </Page>
  );
}

export default ContactDetailPage;
