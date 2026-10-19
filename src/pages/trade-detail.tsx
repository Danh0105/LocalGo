import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, Page, useLocation, useNavigate, useParams } from "zmp-ui";

import PreviewableImage from "@/components/previewable-image";
import { useCurrentUser } from "@/contexts/auth-context";
import { useTradeSaves } from "@/contexts/trade-save-context";
import { AuthRequestError } from "@/services/auth";
import {
  TradePostRequestError,
  TradePostResponse,
  TradeReviewResponse,
  TradeReviewSummary,
  createTradeReview,
  getTradePostCategoryName,
  getTradePostDetail,
  getPublishedTradeReviews,
  getTradeReviewSummary,
  recordTradePostInteraction,
  startTradeConversation,
  uploadTradePostImage,
} from "@/services/trade-posts";
import phone from "@/static/phone.png";
import gps from "@/static/gps.png";
import restaurant from "@/static/restaurant.png";
import "../css/pages/trade.css";

const priceTypeLabels: Record<TradePostResponse["priceType"], string> = {
  FIXED: "Giá cố định",
  NEGOTIABLE: "Có thể thương lượng",
  CONTACT: "Liên hệ báo giá",
};

const emptyReviewSummary: TradeReviewSummary = {
  average: 0,
  total: 0,
  distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  counts: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
};

function postPrice(post: TradePostResponse): string {
  if (post.priceLabel) return post.priceLabel;
  if (post.priceType === "NEGOTIABLE") return "Thỏa thuận";
  if (post.priceType === "CONTACT") return "Liên hệ báo giá";
  if (!post.price) return "Liên hệ";
  const price = Number(post.price);
  return Number.isFinite(price)
    ? `${new Intl.NumberFormat("vi-VN").format(price)}đ`
    : "Liên hệ";
}

function publishedDate(post: TradePostResponse): string {
  const value = post.publishedAt || post.createdAt;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Mới đăng"
    : `Đăng ${new Intl.DateTimeFormat("vi-VN").format(date)}`;
}

function TradeDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user, accessToken, authenticate } = useCurrentUser();
  const { getSaveState, syncTradePosts, toggleSave } = useTradeSaves();
  const [post, setPost] = useState<TradePostResponse | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reviews, setReviews] = useState<TradeReviewResponse[]>([]);
  const [reviewSummary, setReviewSummary] =
    useState<TradeReviewSummary>(emptyReviewSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reviewLoadError, setReviewLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewImages, setReviewImages] = useState<
    Array<{ file: File; previewUrl: string }>
  >([]);
  const [imageError, setImageError] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [reviewSubmitError, setReviewSubmitError] = useState("");
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageError, setMessageError] = useState("");
  const [saveActionError, setSaveActionError] = useState("");
  const [isMessageSending, setIsMessageSending] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const viewerSwipeStartX = useRef<number | null>(null);
  const requestedReviewId =
    (location.state as { reviewId?: string } | null)?.reviewId ?? "";

  useEffect(() => {
    if (!imageViewerOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImageViewerOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [imageViewerOpen]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!id) {
      setLoadError("Không tìm thấy mã tin giao thương.");
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setImageViewerOpen(false);
    setLoadError("");
    setReviewLoadError("");
    void (async () => {
      try {
        const result = await getTradePostDetail(id, controller.signal, accessToken);
        if (!active) return;
        setPost(result);
        syncTradePosts([result]);
        setActiveImageIndex(0);

        try {
          const [publishedReviews, summary] = await Promise.all([
            getPublishedTradeReviews(result.id, controller.signal),
            getTradeReviewSummary(result.id, controller.signal),
          ]);
          if (!active) return;
          setReviews(
            publishedReviews.filter((review) => review.status === "PUBLISHED")
          );
          setReviewSummary(summary);
        } catch (error: unknown) {
          if (!active) return;
          setReviews([]);
          setReviewSummary({
            ...emptyReviewSummary,
            average: Number(result.averageRating) || 0,
            total: result.reviewCount,
          });
          setReviewLoadError(
            error instanceof TradePostRequestError
              ? error.message
              : "Không thể tải đánh giá."
          );
        }
      } catch (error: unknown) {
        if (!active) return;
        setPost(null);
        setLoadError(
          error instanceof TradePostRequestError
            ? error.message
            : "Không thể tải chi tiết tin giao thương."
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [accessToken, id, reloadKey, syncTradePosts]);

  useEffect(() => {
    if (!requestedReviewId || !reviews.some((review) => review.id === requestedReviewId)) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`trade-review-${requestedReviewId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestedReviewId, reviews]);

  const closeReviewPopup = () => {
    setReviewOpen(false);
    setRatingError("");
    setImageError("");
    setReviewSubmitError("");
  };

  const addReviewImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const remainingSlots = 3 - reviewImages.length;

    if (remainingSlots <= 0) {
      setImageError("Bạn chỉ có thể tải tối đa 3 ảnh.");
      event.target.value = "";
      return;
    }

    const selectedFiles = imageFiles.slice(0, remainingSlots);
    setReviewImages((current) => [
      ...current,
      ...selectedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    setImageError(
      files.length > remainingSlots
        ? "Chỉ 3 ảnh đầu tiên được thêm vào đánh giá."
        : ""
    );
    event.target.value = "";
  };

  const removeReviewImage = (previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    setReviewImages((current) =>
      current.filter((item) => item.previewUrl !== previewUrl)
    );
    setImageError("");
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedRating === 0) {
      setRatingError("Vui lòng chọn số sao đánh giá.");
      return;
    }

    const content = reviewContent.trim();
    if (!content) {
      setReviewSubmitError("Vui lòng nhập nội dung đánh giá.");
      return;
    }
    if (!post) {
      setReviewSubmitError("Không tìm thấy tin cần đánh giá.");
      return;
    }

    setIsReviewSubmitting(true);
    setReviewSubmitError("");
    setReviewSubmitMessage("");
    try {
      const token = accessToken ?? (await authenticate()).accessToken;
      const uploadedImages = await Promise.all(
        reviewImages.map(({ file }) => uploadTradePostImage(token, file))
      );
      const created = await createTradeReview(token, post.id, {
        rating: selectedRating,
        content,
        ...(uploadedImages.length
          ? { imageIds: uploadedImages.map((image) => image.id) }
          : {}),
      });
      reviewImages.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      setReviewOpen(false);
      setSelectedRating(0);
      setReviewContent("");
      setReviewImages([]);
      setRatingError("");
      setReviewSubmitMessage(
        created.status === "PUBLISHED"
          ? "Đánh giá đã được đăng."
          : "Đánh giá đã được gửi và đang chờ Admin duyệt."
      );
      if (created.status === "PUBLISHED") {
        setReviews((current) => [created, ...current]);
      }
    } catch (error: unknown) {
      setReviewSubmitError(
        error instanceof AuthRequestError || error instanceof TradePostRequestError
          ? error.message
          : "Không thể gửi đánh giá. Vui lòng thử lại."
      );
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!post || isMessageSending) return;
    const content = messageContent.trim();
    if (!content) {
      setMessageError("Vui lòng nhập nội dung cần trao đổi.");
      return;
    }

    setIsMessageSending(true);
    setMessageError("");
    try {
      const token = accessToken ?? (await authenticate()).accessToken;
      const conversation = await startTradeConversation(token, post.id, content);
      setMessageContent("");
      setMessageOpen(false);
      navigate(`/trade/messages/${conversation.id}`);
    } catch (error: unknown) {
      setMessageError(
        error instanceof AuthRequestError || error instanceof TradePostRequestError
          ? error.message
          : "Không thể gửi tin nhắn. Vui lòng thử lại."
      );
    } finally {
      setIsMessageSending(false);
    }
  };

  const handleToggleSave = async () => {
    if (!post || post.ownerId === user?.id) return;
    setSaveActionError("");
    try {
      const token = accessToken ?? (await authenticate()).accessToken;
      await toggleSave(post, token);
    } catch (error: unknown) {
      if (
        error instanceof TradePostRequestError &&
        error.status === 404 &&
        error.code === "RESOURCE_NOT_FOUND"
      ) {
        setPost(null);
        setLoadError("Tin không còn hiển thị.");
        return;
      }
      setSaveActionError(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật tin đã lưu. Vui lòng thử lại."
      );
    }
  };

  if (isLoading) {
    return (
      <Page className="trade-page">
        <div className="trade-empty trade-detail__not-found">
          <Icon icon="zi-clock-1" />
          <strong>Đang tải tin giao thương</strong>
          <span>Vui lòng chờ trong giây lát.</span>
        </div>
      </Page>
    );
  }

  if (!post || loadError) {
    return (
      <Page className="trade-page">
        <header className="trade-detail__simple-header">
          <button className="trade-back" type="button" onClick={() => navigate(-1)}>
            <Icon icon="zi-arrow-left" />
          </button>
          <h1>Không tìm thấy tin</h1>
        </header>
        <div className="trade-empty trade-detail__not-found">
          <Icon icon="zi-note" />
          <strong>Không thể hiển thị tin giao thương</strong>
          <span>
            {loadError || "Tin có thể đã hết hạn hoặc được người đăng gỡ bỏ."}
          </span>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      </Page>
    );
  }

  const rating = Number.isFinite(reviewSummary.average)
    ? reviewSummary.average
    : Number(post.averageRating) || 0;
  const ownerName = post.owner?.displayName || post.contactName;
  const galleryImages = Array.from(
    new Set(
      (post.images?.length
        ? post.images.map((image) => image.url)
        : [post.thumbnailUrl]
      ).filter((url): url is string => Boolean(url))
    )
  );
  const sliderImages = galleryImages.length > 0 ? galleryImages : [restaurant];
  const currentImageIndex = Math.min(
    activeImageIndex,
    sliderImages.length - 1
  );
  const imageUrl = sliderImages[currentImageIndex];
  const showSliderControls = sliderImages.length > 1;
  const showImage = (index: number) => {
    setActiveImageIndex(
      (index + sliderImages.length) % sliderImages.length
    );
  };
  const showPreviousImage = () => showImage(currentImageIndex - 1);
  const showNextImage = () => showImage(currentImageIndex + 1);
  const badge = post.featured
    ? "Nổi bật"
    : post.promotionPercent
      ? `-${post.promotionPercent}%`
      : null;
  const saveState = getSaveState(post);
  const canSave = post.ownerId !== user?.id;

  return (
    <Page className="trade-page trade-detail-page">
      <section
        className="trade-detail__hero"
        aria-label={`Bộ ảnh tin giao thương, ảnh ${currentImageIndex + 1} trên ${sliderImages.length}`}
        aria-roledescription="carousel"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") showPreviousImage();
          if (event.key === "ArrowRight") showNextImage();
        }}
      >
        <button
          className="trade-back trade-detail__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <span className="trade-detail__category">
          {getTradePostCategoryName(post.category, post.categoryInfo)}
        </span>
        <div
          className="trade-detail__slider-viewport"
          tabIndex={showSliderControls ? 0 : -1}
          onTouchStart={(event) => {
            swipeStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = swipeStartX.current;
            swipeStartX.current = null;
            if (startX === null) return;
            const endX = event.changedTouches[0]?.clientX ?? startX;
            const distance = endX - startX;
            if (Math.abs(distance) < 45) return;
            if (distance > 0) showPreviousImage();
            else showNextImage();
          }}
        >
          <div
            className="trade-detail__slider-track"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {sliderImages.map((image, index) => (
              <div
                className="trade-detail__slide"
                aria-hidden={index !== currentImageIndex}
                key={image}
              >
                <button
                  className="trade-detail__viewer-trigger"
                  type="button"
                  tabIndex={index === currentImageIndex ? 0 : -1}
                  aria-label={`Phóng to ảnh ${index + 1}`}
                  onClick={() => setImageViewerOpen(true)}
                >
                  <img
                    src={image}
                    alt={`${post.title} - ảnh ${index + 1}`}
                    loading={index === 0 ? "eager" : "lazy"}
                    onError={(event) => {
                      event.currentTarget.src = restaurant;
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
        {showSliderControls && (
          <>
            <button
              className="trade-detail__slider-arrow trade-detail__slider-arrow--previous"
              type="button"
              aria-label="Xem ảnh trước"
              onClick={showPreviousImage}
            />
            <button
              className="trade-detail__slider-arrow trade-detail__slider-arrow--next"
              type="button"
              aria-label="Xem ảnh tiếp theo"
              onClick={showNextImage}
            />
            <span className="trade-detail__slider-count" aria-live="polite">
              {currentImageIndex + 1}/{sliderImages.length}
            </span>
          </>
        )}
        {badge && <span className="trade-detail__badge">{badge}</span>}
      </section>

      <main className="trade-detail__content">
        {galleryImages.length > 1 && (
          <div className="trade-detail__gallery" aria-label="Ảnh tin giao thương">
            {galleryImages.map((image, index) => (
              <button
                className={index === currentImageIndex ? "is-active" : ""}
                type="button"
                key={image}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === currentImageIndex ? "true" : undefined}
                onClick={() => showImage(index)}
              >
                <img
                  src={image}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.src = restaurant;
                  }}
                />
              </button>
            ))}
          </div>
        )}

        <section className="trade-detail__card trade-detail__intro">
          <p className="trade-detail__status">Tin đang hoạt động</p>
          <h1>{post.title}</h1>
          <div className="trade-detail__price">{postPrice(post)}</div>
          <div className="trade-detail__rating-summary">
            <span>★</span>
            <strong>{rating.toFixed(1)}</strong>
            <small>{reviewSummary.total} lượt đánh giá</small>
          </div>
          <div className="trade-detail__meta">
            <span>
              <Icon icon="zi-location" />
              {post.address}
            </span>
            <span>
              <Icon icon="zi-clock-1" />
              {publishedDate(post)}
            </span>
            <span>
              <Icon icon="zi-info-circle" />
              {post.viewCount} lượt xem
            </span>
            <span className="trade-detail__save-count">
              <Icon icon="zi-bookmark" />
              {saveState.saveCount} người đã lưu
            </span>
            <span>
              <Icon icon="zi-note" />
              {priceTypeLabels[post.priceType]}
            </span>
          </div>
        </section>

        <section className="trade-detail__card">
          <h2><span />Thông tin người đăng</h2>
          <div className="trade-detail__owner">
            <div className="trade-detail__avatar">
              {post.owner?.avatarUrl ? (
                <img src={post.owner.avatarUrl} alt="" />
              ) : (
                ownerName.charAt(0)
              )}
            </div>
            <div>
              <strong>{ownerName}</strong>
              <p>{post.owner?.role === "BUSINESS" ? "Tài khoản Business" : "Thành viên LocalGo"}</p>
            </div>
            <span className="trade-detail__verified">Đã xác thực</span>
          </div>
          <div className="trade-detail__contacts">
            <p><span>Người liên hệ</span><strong>{post.contactName}</strong></p>
            <p><span>Điện thoại</span><strong>{post.contactPhone}</strong></p>
            {post.contactZalo && (
              <p><span>Zalo</span><strong>{post.contactZalo}</strong></p>
            )}
          </div>
        </section>

        <section className="trade-detail__card">
          <h2><span />Nội dung chi tiết</h2>
          <p className="trade-detail__paragraph">{post.summary}</p>
          <p className="trade-detail__paragraph">{post.description}</p>
        </section>

        <section className="trade-detail__card">
          <h2><span />Khu vực giao dịch</h2>
          <div className="trade-detail__location">
            <img src={gps} alt="" />
            <div>
              <strong>{post.address}</strong>
              <p>Có thể thỏa thuận giao nhận trong khu vực.</p>
            </div>
          </div>
        </section>

        <section className="trade-detail__card trade-reviews">
          <div className="trade-reviews__heading">
            <h2><span />Đánh giá giao thương</h2>
            <button type="button" onClick={() => setReviewOpen(true)}>
              Viết đánh giá
            </button>
          </div>
          {reviewSubmitMessage && (
            <p className="trade-detail__paragraph">{reviewSubmitMessage}</p>
          )}

          <div className="trade-reviews__overview">
            <div className="trade-reviews__score">
              <strong>{rating.toFixed(1)}</strong>
              <div aria-label={`${rating} trên 5 sao`}>★★★★★</div>
              <span>{reviewSummary.total} đánh giá</span>
            </div>
            <div className="trade-reviews__bars">
              {[5, 4, 3, 2, 1].map((star) => {
                const width = reviewSummary.distribution[String(star) as "1" | "2" | "3" | "4" | "5"];
                return (
                  <div className="trade-reviews__bar" key={star}>
                    <span>{star}</span>
                    <span className="trade-reviews__star">★</span>
                    <i><b style={{ width: `${width}%` }} /></i>
                    <small>{width}%</small>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="trade-reviews__list">
            {reviews.map((review) => (
              <article
                className="trade-review"
                id={`trade-review-${review.id}`}
                key={review.id}
              >
                <div className="trade-review__avatar">
                  {review.reviewer?.avatarUrl ? (
                    <img src={review.reviewer.avatarUrl} alt="" />
                  ) : (
                    (review.reviewer?.displayName || "T").charAt(0)
                  )}
                </div>
                <div>
                  <div className="trade-review__topline">
                    <strong>{review.reviewer?.displayName || "Thành viên LocalGo"}</strong>
                    <span>
                      {new Intl.DateTimeFormat("vi-VN").format(
                        new Date(review.createdAt)
                      )}
                    </span>
                  </div>
                  <div className="trade-review__stars">
                    {Array.from({ length: 5 }, (_, index) => (
                      <i
                        className={index < review.rating ? "is-active" : ""}
                        key={index}
                      >
                        ★
                      </i>
                    ))}
                  </div>
                  <p>{review.content}</p>
                  {review.images.length > 0 && (
                    <div className="trade-review__photos">
                      {review.images.map((image, index) => (
                        <PreviewableImage
                          src={image.thumbnailUrl || image.url}
                          alt={`Ảnh đánh giá ${index + 1}`}
                          previewImages={review.images.map(
                            (reviewImage, reviewImageIndex) => ({
                              src: reviewImage.url,
                              alt: `Ảnh đánh giá ${reviewImageIndex + 1}`,
                            })
                          )}
                          previewIndex={index}
                          previewTitle="Ảnh đánh giá giao thương"
                          key={image.id}
                        />
                      ))}
                    </div>
                  )}
                  {review.replyContent && (
                    <div className="trade-review__owner-reply">
                      <strong>Phản hồi từ người bán</strong>
                      <p>{review.replyContent}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
            {reviews.length === 0 && (
              <div className="trade-empty">
                <Icon icon="zi-star" />
                <strong>Chưa có đánh giá được duyệt</strong>
                <span>{reviewLoadError || "Hãy là người đầu tiên chia sẻ trải nghiệm."}</span>
              </div>
            )}
          </div>

          {reviewSummary.total > reviews.length && (
            <button className="trade-reviews__more" type="button">
              Đã hiển thị {reviews.length}/{reviewSummary.total} đánh giá
            </button>
          )}
        </section>
      </main>

      <div className="trade-detail__actions">
        {canSave && (
          <button
            className={`trade-detail__save${
              saveState.isSaved ? " is-saved" : ""
            }`}
            type="button"
            aria-pressed={saveState.isSaved}
            disabled={saveState.isSaving}
            onClick={() => void handleToggleSave()}
          >
            <Icon icon="zi-bookmark" />
            <span>{saveState.isSaved ? "Đã lưu" : "Lưu tin"}</span>
          </button>
        )}
        {post.ownerId !== user?.id && (
          <button
            className="trade-detail__message"
            type="button"
            onClick={() => {
              setMessageError("");
              setMessageOpen(true);
            }}
          >
            <Icon icon="zi-chat" />
            Nhắn tin
          </button>
        )}
        <button
          className="trade-detail__call"
          type="button"
          aria-label={`Gọi ${post.contactPhone}`}
          onClick={() => {
            void recordTradePostInteraction(post.id, "CONTACT_PHONE");
            window.location.href = `tel:${post.contactPhone}`;
          }}
        >
          <img src={phone} alt="" />
          <span>
            <strong>Liên hệ ngay</strong>
            <small>{post.contactPhone}</small>
          </span>
        </button>
      </div>

      {saveActionError && (
        <p className="trade-detail__save-error" role="alert">
          {saveActionError}
        </p>
      )}

      {messageOpen && (
        <div
          className="trade-message-popup"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isMessageSending) {
              setMessageOpen(false);
            }
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="trade-message-title">
            <header>
              <div>
                <span>Trao đổi trực tiếp</span>
                <h2 id="trade-message-title">Nhắn tin cho {ownerName}</h2>
              </div>
              <button type="button" aria-label="Đóng" disabled={isMessageSending} onClick={() => setMessageOpen(false)}>×</button>
            </header>
            <div className="trade-message-popup__post">
              <img src={imageUrl} alt="" />
              <strong>{post.title}</strong>
            </div>
            <form onSubmit={submitMessage}>
              <label>
                <span>Nội dung trao đổi</span>
                <textarea
                  autoFocus
                  rows={4}
                  maxLength={1000}
                  value={messageContent}
                  placeholder="Ví dụ: Sản phẩm này còn không? Tôi muốn biết thêm về giá và cách giao nhận..."
                  onChange={(event) => setMessageContent(event.target.value)}
                />
                <small>{messageContent.length}/1000</small>
              </label>
              {messageError && <p className="trade-flow__message--error" role="alert">{messageError}</p>}
              <div>
                <button type="button" disabled={isMessageSending} onClick={() => setMessageOpen(false)}>Hủy</button>
                <button type="submit" disabled={isMessageSending}>{isMessageSending ? "Đang gửi..." : "Gửi tin nhắn"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {reviewOpen && (
        <div
          className="trade-review-popup"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReviewPopup();
          }}
        >
          <section
            className="trade-review-popup__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-review-title"
          >
            <div className="trade-review-popup__handle" />
            <header className="trade-review-popup__header">
              <div>
                <span>Chia sẻ trải nghiệm</span>
                <h2 id="trade-review-title">Viết đánh giá</h2>
              </div>
              <button type="button" aria-label="Đóng" onClick={closeReviewPopup}>
                ×
              </button>
            </header>

            <div className="trade-review-popup__subject">
              <img src={imageUrl} alt="" />
              <div>
                <strong>{post.title}</strong>
                <span>{ownerName}</span>
              </div>
            </div>

            <form onSubmit={submitReview}>
              <fieldset className="trade-review-popup__rating">
                <legend>Bạn cảm thấy giao thương này thế nào?</legend>
                <div>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      className={rating <= selectedRating ? "is-active" : ""}
                      key={rating}
                      type="button"
                      aria-label={`${rating} sao`}
                      onClick={() => {
                        setSelectedRating(rating);
                        setRatingError("");
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span>
                  {selectedRating === 0
                    ? "Chạm để chọn số sao"
                    : ["", "Chưa hài lòng", "Tạm ổn", "Hài lòng", "Rất tốt", "Tuyệt vời"][selectedRating]}
                </span>
                {ratingError && <p>{ratingError}</p>}
              </fieldset>

              <label className="trade-review-popup__content">
                <span>Nhận xét của bạn</span>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={reviewContent}
                  placeholder="Chia sẻ chất lượng sản phẩm, thái độ phục vụ hoặc trải nghiệm giao dịch..."
                  onChange={(event) => setReviewContent(event.target.value)}
                />
                <small>{reviewContent.length}/500</small>
              </label>

              <div className="trade-review-popup__upload">
                <div className="trade-review-popup__upload-heading">
                  <span>Hình ảnh thực tế</span>
                  <small>{reviewImages.length}/3 ảnh</small>
                </div>
                <div className="trade-review-popup__previews">
                  {reviewImages.map((image, index) => (
                    <div
                      className="trade-review-popup__preview"
                      key={image.previewUrl}
                    >
                      <PreviewableImage
                        src={image.previewUrl}
                        alt={`Ảnh đã chọn ${index + 1}`}
                        previewImages={reviewImages.map(
                          (reviewImage) => reviewImage.previewUrl
                        )}
                        previewIndex={index}
                        previewTitle="Ảnh đánh giá đã chọn"
                      />
                      <button
                        type="button"
                        aria-label={`Xóa ảnh ${index + 1}`}
                        onClick={() => removeReviewImage(image.previewUrl)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {reviewImages.length < 3 && (
                    <label className="trade-review-popup__add-photo">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={addReviewImages}
                      />
                      <span>+</span>
                      <small>Thêm ảnh</small>
                    </label>
                  )}
                </div>
                {imageError && <p>{imageError}</p>}
              </div>

              {reviewSubmitError && (
                <p className="trade-flow__message--error">{reviewSubmitError}</p>
              )}

              <div className="trade-review-popup__actions">
                <button
                  type="button"
                  disabled={isReviewSubmitting}
                  onClick={closeReviewPopup}
                >
                  Để sau
                </button>
                <button type="submit" disabled={isReviewSubmitting}>
                  {isReviewSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {imageViewerOpen &&
        createPortal(
          <section
            className="trade-image-viewer"
            role="dialog"
            aria-modal="true"
            aria-label={`Xem ảnh ${post.title}`}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                showPreviousImage();
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                showNextImage();
              }
            }}
          >
            <header className="trade-image-viewer__header">
              <button
                type="button"
                autoFocus
                aria-label="Đóng trình xem ảnh"
                onClick={() => setImageViewerOpen(false)}
              >
                ×
              </button>
              <strong>Ảnh tin giao thương</strong>
              <span aria-live="polite">
                {currentImageIndex + 1}/{sliderImages.length}
              </span>
            </header>

            <div
              className="trade-image-viewer__stage"
              onTouchStart={(event) => {
                viewerSwipeStartX.current =
                  event.changedTouches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const startX = viewerSwipeStartX.current;
                viewerSwipeStartX.current = null;
                if (startX === null) return;
                const endX = event.changedTouches[0]?.clientX ?? startX;
                const distance = endX - startX;
                if (Math.abs(distance) < 45) return;
                if (distance > 0) showPreviousImage();
                else showNextImage();
              }}
            >
              <div
                className="trade-image-viewer__track"
                style={{
                  transform: `translateX(-${currentImageIndex * 100}%)`,
                }}
              >
                {sliderImages.map((image, index) => (
                  <div
                    className="trade-image-viewer__slide"
                    aria-hidden={index !== currentImageIndex}
                    key={image}
                  >
                    <img
                      src={image}
                      alt={`${post.title} - ảnh phóng to ${index + 1}`}
                      draggable={false}
                      onError={(event) => {
                        event.currentTarget.src = restaurant;
                      }}
                    />
                  </div>
                ))}
              </div>

              {showSliderControls && (
                <>
                  <button
                    className="trade-image-viewer__arrow trade-image-viewer__arrow--previous"
                    type="button"
                    aria-label="Xem ảnh trước"
                    onClick={showPreviousImage}
                  />
                  <button
                    className="trade-image-viewer__arrow trade-image-viewer__arrow--next"
                    type="button"
                    aria-label="Xem ảnh tiếp theo"
                    onClick={showNextImage}
                  />
                </>
              )}
            </div>

            {showSliderControls && (
              <nav
                className="trade-image-viewer__thumbnails"
                aria-label="Chọn ảnh cần xem"
              >
                {sliderImages.map((image, index) => (
                  <button
                    className={index === currentImageIndex ? "is-active" : ""}
                    type="button"
                    key={image}
                    aria-label={`Xem ảnh ${index + 1}`}
                    aria-current={
                      index === currentImageIndex ? "true" : undefined
                    }
                    onClick={() => showImage(index)}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </nav>
            )}
          </section>,
          document.body
        )}
    </Page>
  );
}

export default TradeDetailPage;
