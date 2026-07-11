import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";

import { ContactItem } from "@/data/contacts";
import { getContactById } from "@/services/contacts";
import "../css/pages/contacts.css";

function ContactDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<ContactItem>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    if (!id) {
      setContact(undefined);
      setIsLoading(false);
      return;
    }

    getContactById(id).then((data) => {
      if (!isActive) return;
      setContact(data);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Page className="contacts-page">
        <p className="contacts-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  if (!contact) {
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
          <h1>Không tìm thấy liên hệ</h1>
        </header>
      </Page>
    );
  }

  return (
    <Page className="contacts-page">
      <section className="contact-detail__hero">
        <img src={contact.image} alt="" />
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
