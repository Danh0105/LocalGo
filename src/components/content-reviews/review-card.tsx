import type { ContentReview } from "@/types/content-reviews";
import PreviewableImage from "@/components/previewable-image";
import ReviewStars from "./review-stars";

export default function ReviewCard({
  review,
  own = false,
  onEdit,
  onDelete,
}: {
  review: ContentReview;
  own?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const name = review.reviewer?.displayName || "Thành viên LocalGo";
  return (
    <article className="content-review" id={`content-review-${review.id}`}>
      <header className="content-review__header">
        <div className="content-review__avatar">
          {review.reviewer?.avatarUrl ? (
            <img src={review.reviewer.avatarUrl} alt="" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="content-review__identity">
          <strong>
            {name}
            {own && <small> • Bạn</small>}
          </strong>
          <time dateTime={review.createdAt}>
            {new Date(review.createdAt).toLocaleDateString("vi-VN")}
          </time>
        </div>
        <ReviewStars rating={review.rating} />
      </header>
      {review.status === "HIDDEN" && (
        <p className="content-review__hidden">
          Đánh giá đang được ẩn. Chỉnh sửa sẽ không tự công khai lại.
        </p>
      )}
      <p className="content-review__content">{review.content}</p>
      {!!review.images?.length && (
        <div className="content-review__images">
          {review.images.map((image, index) => (
            <PreviewableImage
              key={image.id}
              src={image.thumbnailUrl || image.url}
              alt={`Ảnh đánh giá ${index + 1}`}
              previewImages={review.images.map((img) => ({ src: img.url }))}
              previewIndex={index}
              previewTitle="Ảnh trải nghiệm"
            />
          ))}
        </div>
      )}
      {review.replyContent && (
        <div className="content-review__reply">
          <strong>Phản hồi từ ban quản lý</strong>
          <p>{review.replyContent}</p>
        </div>
      )}
      {own && (onEdit || onDelete) && (
        <div className="content-review__actions">
          {onEdit && (
            <button type="button" onClick={onEdit}>
              Sửa đánh giá
            </button>
          )}
          {onDelete && (
            <button type="button" className="is-danger" onClick={onDelete}>
              Xóa đánh giá
            </button>
          )}
        </div>
      )}
    </article>
  );
}
