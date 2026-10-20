import { useEffect, useState } from "react";
import { Icon, Page, useNavigate, useParams } from "zmp-ui";
import { PhoneCall, MapPinned } from "lucide-react";

import DirectionsButton from "@/components/directions-button";
import PreviewableImage from "@/components/previewable-image";

import type { CuisineItem } from "@/types/cuisine";

import { getCuisineItemById, getSafeCuisineMapsUrl } from "@/services/cuisine";

import { callPhone } from "@/utils/contact";

import "../css/pages/cuisine.css";
import "../css/pages/cuisine-enhancements.css";

type LoadError = "not-found" | "request" | null;

/**
 * Hiển thị đánh giá sao.
 */
function Stars({ rating }: { rating: number }) {
  const safeRating = Number.isFinite(rating) ? rating : 0;

  const count = Math.max(0, Math.min(5, Math.round(safeRating)));

  return (
    <span
      className="cuisine-detail__stars"
      aria-label={`${safeRating} trên 5 sao`}
    >
      {"★".repeat(count)}

      <span className="cuisine-detail__stars-empty">
        {"☆".repeat(5 - count)}
      </span>
    </span>
  );
}

/**
 * Trang chi tiết món ăn.
 */
function CuisineDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [item, setItem] = useState<CuisineItem>();
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<LoadError>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [calling, setCalling] = useState(false);

  /**
   * Tải dữ liệu từ Backend.
   */
  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setItem(undefined);
    setError(null);

    if (!id) {
      setError("not-found");
      setIsLoading(false);

      return () => controller.abort();
    }

    async function load(): Promise<void> {
      try {
        const result = await getCuisineItemById(id!, controller.signal);

        if (controller.signal.aborted) return;

        if (!result) {
          setError("not-found");
        } else {
          setItem(result);
        }
      } catch (requestError: unknown) {
        if (controller.signal.aborted) return;

        if (
          requestError instanceof Error &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError("request");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [id, retryKey]);

  /**
   * Đang tải dữ liệu.
   */
  if (isLoading) {
    return (
      <Page className="cuisine-page">
        <p className="cuisine-status" role="status">
          Đang tải dữ liệu...
        </p>
      </Page>
    );
  }

  /**
   * API lỗi hoặc không tìm thấy.
   */
  if (!item || error) {
    return (
      <Page className="cuisine-page">
        <header className="cuisine-header">
          <button
            className="cuisine-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>

          <h1>
            {error === "request"
              ? "Không thể tải dữ liệu"
              : "Không tìm thấy món ăn"}
          </h1>
        </header>

        <main className="cuisine-content">
          <p className="cuisine-detail__empty">
            {error === "request"
              ? "Kết nối không thành công. Vui lòng thử lại."
              : "Món ăn này không tồn tại, đã bị ẩn hoặc đã bị xóa."}
          </p>

          {error === "request" && (
            <button
              className="cuisine-detail__retry"
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

  /**
   * Chuẩn hóa số điện thoại.
   */
  const phoneNumber = (item.contactPhone ?? "").trim().replace(/[^\d+]/g, "");

  const canCall = /^\+?\d{8,15}$/.test(phoneNumber);

  const mainMapsUrl = getSafeCuisineMapsUrl(item.googleMapsUrl);

  /**
   * Mở ứng dụng gọi điện Android/iOS.
   */
  async function handleCall(): Promise<void> {
    if (!canCall || calling) return;

    try {
      setCalling(true);
      await callPhone(phoneNumber);
    } catch (callError) {
      console.error("Không thể mở ứng dụng gọi điện:", callError);
    } finally {
      setCalling(false);
    }
  }

  return (
    <Page className="cuisine-page">
      {/* ===================================
          ẢNH ĐẠI DIỆN
      =================================== */}
      <section className="cuisine-detail__hero">
        <PreviewableImage
          src={item.image}
          alt={item.imageAlt || item.name}
          previewTitle={item.name}
        />

        <button
          className="cuisine-back cuisine-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
      </section>

      <main className="cuisine-detail__content">
        {/* ===================================
            THÔNG TIN MÓN ĂN
        =================================== */}
        <section className="cuisine-detail__card">
          <span className="cuisine-card__category">{item.category}</span>

          <h1>{item.name}</h1>

          <ul className="cuisine-detail__meta">
            <li>
              <Icon icon="zi-note" />
              <span>{item.priceRange}</span>
            </li>

            <li>
              <Icon icon="zi-clock-1" />
              <span>{item.bestTime}</span>
            </li>
          </ul>

          {/* Đánh giá tổng quan */}
          {item.reviewCount > 0 && (
            <div className="cuisine-detail__rating-summary">
              <Stars rating={item.averageRating} />

              <strong>{item.averageRating.toFixed(1)}/5</strong>

              <span>({item.reviewCount} đánh giá)</span>
            </div>
          )}

          {/* Mô tả ngắn */}
          {item.summary && (
            <p className="cuisine-detail__paragraph">{item.summary}</p>
          )}

          {/* ===================================
              NÚT LIÊN HỆ CAO CẤP
          =================================== */}
          <div className="cuisine-premium-actions">
            {/* Google Maps */}
            {mainMapsUrl && (
              <div className="cuisine-premium-map">
                <MapPinned size={20} strokeWidth={1.8} aria-hidden="true" />

                <DirectionsButton googleMapsUrl={mainMapsUrl} />
              </div>
            )}

            {/* Gọi điện thoại */}
            {canCall && (
              <button
                type="button"
                className="cuisine-premium-contact cuisine-premium-contact--phone"
                disabled={calling}
                aria-label={`Gọi ${item.contactPhone}`}
                onClick={() => void handleCall()}
              >
                <span className="cuisine-premium-contact__icon">
                  <PhoneCall size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>

                <span className="cuisine-premium-contact__label">
                  {calling ? "Đang mở..." : "Gọi điện"}
                </span>
              </button>
            )}
          </div>
        </section>

        {/* ===================================
            GIỚI THIỆU
        =================================== */}
        {item.description.length > 0 && (
          <section className="cuisine-detail__card">
            <h2>Giới thiệu món ăn</h2>

            {item.description.map((paragraph, index) => (
              <p
                className="cuisine-detail__paragraph"
                key={`description-${index}`}
              >
                {paragraph}
              </p>
            ))}
          </section>
        )}

        {/* ===================================
            ĐIỂM THÚ VỊ
        =================================== */}
        {item.highlights.length > 0 && (
          <section className="cuisine-detail__card">
            <h2>Điểm thú vị</h2>

            <ul className="cuisine-detail__highlights">
              {item.highlights.map((highlight, index) => (
                <li key={`highlight-${index}`}>
                  <Icon icon="zi-check-circle-solid" />

                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ===================================
            THƯ VIỆN ẢNH
        =================================== */}
        {item.galleryImages.length > 0 && (
          <section className="cuisine-detail__card">
            <h2>Hình ảnh món ăn</h2>

            <div className="cuisine-detail__gallery">
              {item.galleryImages
                .filter((media) => media.imageUrl)
                .map((media, index) => (
                  <div
                    className="cuisine-detail__gallery-item"
                    key={media.mediaId}
                  >
                    <PreviewableImage
                      src={media.imageUrl}
                      alt={`${item.name} - ảnh ${index + 1}`}
                      previewTitle={`${item.name} - ảnh ${index + 1}`}
                    />
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ===================================
            THỰC ĐƠN THAM KHẢO
        =================================== */}
        {item.menu.length > 0 && (
          <section className="cuisine-detail__card">
            <h2>Thực đơn tham khảo</h2>

            <ul className="cuisine-detail__menu">
              {item.menu.map((menuItem) => (
                <li className="cuisine-detail__menu-item" key={menuItem.id}>
                  <div className="cuisine-detail__menu-heading">
                    <strong>{menuItem.name}</strong>

                    {menuItem.price && <span>{menuItem.price}</span>}
                  </div>

                  {menuItem.description && <p>{menuItem.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ===================================
            ĐỊA ĐIỂM GỢI Ý
        =================================== */}
        {item.suggestedPlaceDetails.length > 0 && (
          <section className="cuisine-detail__card">
            <h2>Gợi ý địa điểm</h2>

            <ul className="cuisine-detail__places">
              {item.suggestedPlaceDetails.map((place) => {
                const safeUrl = getSafeCuisineMapsUrl(place.googleMapsUrl);

                return (
                  <li key={place.id}>
                    <Icon icon="zi-location" aria-hidden="true" />

                    <div>
                      <strong>{place.name}</strong>

                      {place.address && <p>{place.address}</p>}

                      {safeUrl && <DirectionsButton googleMapsUrl={safeUrl} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ===================================
            ĐÁNH GIÁ & PHẢN HỒI
        =================================== */}
        {item.reviews.length > 0 && (
          <section className="cuisine-detail__card">
            <h2>Đánh giá &amp; phản hồi</h2>

            <ul className="cuisine-detail__reviews">
              {item.reviews.map((review) => (
                <li className="cuisine-detail__review" key={review.id}>
                  <div className="cuisine-detail__review-heading">
                    <strong>{review.reviewerName}</strong>

                    <Stars rating={review.rating} />
                  </div>

                  {review.feedback && <p>{review.feedback}</p>}

                  {review.adminResponse && (
                    <div className="cuisine-detail__admin-response">
                      <strong>Phản hồi từ quán / quản trị viên</strong>

                      <p>{review.adminResponse}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ===================================
            MẸO NHỎ
        =================================== */}
        {item.tip && (
          <section className="cuisine-detail__card cuisine-detail__tip">
            <h2>Mẹo nhỏ</h2>

            <p className="cuisine-detail__paragraph">{item.tip}</p>
          </section>
        )}
      </main>
    </Page>
  );
}

export default CuisineDetailPage;
