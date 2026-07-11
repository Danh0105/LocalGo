import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { ContactCategory, ContactItem } from "@/data/contacts";
import { getContacts } from "@/services/contacts";
import "../css/pages/contacts.css";

type ContactFilter = "Tất cả" | ContactCategory;

const filters: ContactFilter[] = [
  "Tất cả",
  "Hành chính",
  "Khẩn cấp",
  "Du lịch",
  "Nông nghiệp",
  "Phản ánh",
];

function ContactsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<ContactFilter>("Tất cả");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getContacts({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setContacts(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải danh sách liên hệ.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

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
        <div>
          <span>Kênh hỗ trợ</span>
          <h1>Liên hệ</h1>
        </div>
      </header>

      <main className="contacts-content">
        <section className="contacts-intro">
          <p>
            Danh bạ liên hệ nhanh cho hành chính, y tế, an ninh, du lịch, nông
            nghiệp và phản ánh cộng đồng.
          </p>
        </section>

        <div className="contacts-filters">
          {filters.map((filter) => (
            <button
              className={`contacts-filter${
                filter === activeFilter ? " contacts-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {isLoading && <p className="contacts-status">Đang tải dữ liệu...</p>}
        {!isLoading && error && (
          <p className="contacts-status contacts-status--error">{error}</p>
        )}
        {!isLoading && !error && contacts.length === 0 && (
          <p className="contacts-status">Chưa có liên hệ trong nhóm này.</p>
        )}

        {!isLoading && !error && (
          <section className="contacts-list">
            {contacts.map((contact) => (
              <button
                className="contact-card"
                key={contact.id}
                type="button"
                onClick={() => navigate(`/contacts/${contact.id}`)}
              >
                <div className="contact-card__image">
                  <img src={contact.image} alt="" />
                </div>
                <div className="contact-card__body">
                  <span className="contact-card__category">
                    {contact.category}
                  </span>
                  <h2>{contact.name}</h2>
                  <p className="contact-card__phone">
                    <Icon icon="zi-call" />
                    <span>{contact.phone}</span>
                  </p>
                  <p className="contact-card__summary">{contact.summary}</p>
                </div>
                <Icon className="contact-card__arrow" icon="zi-chevron-right" />
              </button>
            ))}
          </section>
        )}
      </main>
    </Page>
  );
}

export default ContactsPage;
