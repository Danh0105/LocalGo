import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";
import { callPhone, composeEmail } from "@/utils/contact";
import DirectionsButton from "@/components/directions-button";
import PreviewableImage from "@/components/previewable-image";
import { PhoneCall, Mail } from "lucide-react";
import type { Specialty, SpecialtyBuyPlace } from "@/data/specialties";

import { getSpecialtyById } from "@/services/specialties";

import "../css/pages/specialties.css";

function SpecialtyDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [specialty, setSpecialty] = useState<Specialty | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<"not-found" | "request" | null>(null);

  const [retryKey, setRetryKey] = useState(0);

  // Lấy thông tin đặc sản từ Backend.
  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);
    setSpecialty(undefined);

    if (!id) {
      setError("not-found");
      setIsLoading(false);
      return () => controller.abort();
    }

    async function load(): Promise<void> {
      try {
        const result = await getSpecialtyById(id!, controller.signal);

        if (controller.signal.aborted) return;

        if (!result) {
          setError("not-found");
          return;
        }

        setSpecialty(result);
      } catch (requestError: unknown) {
        if (controller.signal.aborted) return;

        if (
          requestError instanceof Error &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error && requestError.message === "NOT_FOUND"
            ? "not-found"
            : "request",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [id, retryKey]);

  // Trạng thái đang tải.
  if (isLoading) {
    return (
      <Page className="specialties-page">
        <p className="specialties-status">Đang tải dữ liệu...</p>
      </Page>
    );
  }

  // Trạng thái không tìm thấy hoặc API lỗi.
  if (!specialty || error) {
    return (
      <Page className="specialties-page">
        <header className="specialties-header">
          <button
            className="specialties-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>

          <h1>
            {error === "request" ? "Không thể tải dữ liệu" : "Không tìm thấy"}
          </h1>
        </header>

        <main className="specialties-content">
          <p className="specialty-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Đặc sản này không tồn tại hoặc đã bị xóa."}
          </p>

          {error === "request" && (
            <button
              className="specialty-detail__retry"
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

  // Ưu tiên JSON object mới từ Backend.
  // Nếu chưa có, chuyển dữ liệu string[] cũ.
  const places: SpecialtyBuyPlace[] = specialty.buyPlaceDetails?.length
    ? specialty.buyPlaceDetails
    : (specialty.buyPlaces ?? []).map((name, index) => ({
        id: `legacy-${index}`,
        name,
        address: "",
        googleMapsUrl: "",
        phone: "",
        email: "",
      }));

  return (
    <Page className="specialties-page">
      {/* Ảnh đại diện đặc sản */}
      <section className="specialty-detail__hero">
        <PreviewableImage
          src={specialty.image}
          alt={specialty.name}
          previewTitle={specialty.name}
        />

        <button
          className="specialties-back specialty-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="specialties-content specialty-detail__content">
        {/* Thông tin cơ bản */}
        <section className="specialty-detail__card">
          <span className="specialty-card__category">{specialty.category}</span>

          <h1 className="specialty-detail__name">{specialty.name}</h1>

          <ul className="specialty-detail__info">
            <li>
              <Icon icon="zi-note" />
              <span>{specialty.price}</span>
            </li>

            <li>
              <Icon icon="zi-clock-1" />
              <span>{specialty.season}</span>
            </li>
          </ul>

          {specialty.googleMapsUrl && (
            <DirectionsButton googleMapsUrl={specialty.googleMapsUrl} />
          )}
        </section>

        {/* Giới thiệu */}
        <section className="specialty-detail__card">
          <h2 className="specialty-detail__section-title">
            <span />
            Giới thiệu
          </h2>

          {specialty.summary && (
            <p className="specialty-detail__paragraph">{specialty.summary}</p>
          )}

          {specialty.description?.map((paragraph, index) => (
            <p className="specialty-detail__paragraph" key={index}>
              {paragraph}
            </p>
          ))}
        </section>

        {/* Danh sách địa điểm mua */}
        <section className="specialty-detail__card">
          <h2 className="specialty-detail__section-title">
            <span />
            Mua ở đâu
          </h2>

          {places.length === 0 ? (
            <p className="specialty-detail__empty">
              Chưa có thông tin địa điểm mua.
            </p>
          ) : (
            <ul className="specialty-detail__places">
              {places.map((place, index) => {
                const phone = place.phone?.trim();
                const email = place.email?.trim();
                const googleMapsUrl = place.googleMapsUrl?.trim();

                const sanitizedPhone = phone
                  ? phone.replace(/[^\d+]/g, "")
                  : "";

                return (
                  <li key={`${place.id}-${index}`}>
                    <span
                      className="specialty-detail__place-icon"
                      aria-hidden="true"
                    >
                      <Icon icon="zi-location-solid" />
                    </span>

                    <div className="specialty-detail__place-content">
                      {/* Tên địa điểm */}
                      <strong>{place.name}</strong>

                      {/* Địa chỉ */}
                      {place.address?.trim() && <p>{place.address}</p>}

                      {/* Thông tin liên hệ */}
                      <div className="specialty-detail__place-actions">
                        {/* Google Maps */}
                        {googleMapsUrl && (
                          <DirectionsButton
                            googleMapsUrl={googleMapsUrl}
                            label="Xem bản đồ"
                            className="specialty-detail__place-map"
                          />
                        )}

                        {/* Gọi điện */}
                        {phone && (
                          <button
                            type="button"
                            className="specialty-contact specialty-contact--phone"
                            aria-label={`Gọi điện đến ${phone}`}
                            onClick={() => {
                              void callPhone(phone).catch((error) => {
                                console.error("Không thể mở cuộc gọi:", error);
                              });
                            }}
                          >
                            <span className="specialty-contact__icon">
                              <PhoneCall size={20} strokeWidth={1.8} />
                            </span>

                            <span className="specialty-contact__label">
                              Gọi điện
                            </span>
                          </button>
                        )}

                        {/* Gửi email */}
                        {email && (
                          <button
                            type="button"
                            className="specialty-contact specialty-contact--email"
                            aria-label={`Gửi email đến ${email}`}
                            onClick={() => {
                              try {
                                composeEmail(email, place.name);
                              } catch (error) {
                                console.error("Không thể mở email:", error);
                              }
                            }}
                          >
                            <span className="specialty-contact__icon">
                              <Mail size={20} strokeWidth={1.8} />
                            </span>

                            <span className="specialty-contact__label">
                              Email
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </Page>
  );
}

export default SpecialtyDetailPage;
