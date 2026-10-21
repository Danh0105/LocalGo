import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, X } from "lucide-react";
import { useDialog } from "@/hooks/use-dialog";
import { getApiErrorMessage } from "@/lib/http-client";
import type { ContentReview } from "@/types/content-reviews";

export interface ReviewFormValue {
  rating: number;
  content: string;
  retainedIds: string[];
  files: File[];
}
interface Photo {
  id?: string;
  file?: File;
  url: string;
}

export default function ReviewForm({
  title,
  review,
  onClose,
  onSave,
}: {
  title: string;
  review: ContentReview | null;
  onClose: () => void;
  onSave: (value: ReviewFormValue) => Promise<void>;
}) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [content, setContent] = useState(review?.content ?? "");
  const [photos, setPhotos] = useState<Photo[]>(() =>
    (review?.images ?? []).map((image) => ({
      id: image.id,
      url: image.thumbnailUrl || image.url,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const urls = useRef(new Set<string>());
  const panel = useRef<HTMLDivElement>(null);
  useDialog(panel, () => {
    if (!lock.current) onClose();
  });
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length + photos.length > 3) {
      setError("Mỗi đánh giá được đính kèm tối đa 3 ảnh.");
      return;
    }
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size <= 0 ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError("Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh.");
      return;
    }
    setError("");
    setPhotos((current) => [
      ...current,
      ...files.map((file) => {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        return { file, url };
      }),
    ]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!rating) {
      setError("Vui lòng chọn số sao đánh giá.");
      return;
    }
    if (!content.trim() || content.trim().length > 1000) {
      setError("Nhập nội dung đánh giá từ 1 đến 1000 ký tự.");
      return;
    }
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave({
        rating,
        content: content.trim(),
        retainedIds: photos.flatMap((photo) => (photo.id ? [photo.id] : [])),
        files: photos.flatMap((photo) => (photo.file ? [photo.file] : [])),
      });
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return createPortal(
    <div className="content-review-modal">
      <div
        className="content-review-modal__backdrop"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        className="content-review-modal__panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-review-form-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <span>CHIA SẺ TRẢI NGHIỆM</span>
            <h2 id="content-review-form-title">
              {review ? "Sửa đánh giá" : "Viết đánh giá"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Đóng đánh giá"
            disabled={saving}
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        <p className="content-review-modal__subject">{title}</p>
        <form onSubmit={submit}>
          <fieldset disabled={saving} className="content-review-form__fields">
            <fieldset className="content-review-form__rating">
              <legend>Trải nghiệm của bạn thế nào?</legend>
              <div role="radiogroup" aria-label="Số sao đánh giá">
                {[1, 2, 3, 4, 5].map((star) => (
                  <label key={star}>
                    <input
                      type="radio"
                      name="review-rating"
                      value={star}
                      checked={rating === star}
                      onChange={() => setRating(star)}
                    />
                    <span
                      className={star <= rating ? "is-active" : ""}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                    <span className="content-reviews__sr-only">{star} sao</span>
                  </label>
                ))}
              </div>
              <p>
                {
                  [
                    "Chạm để chọn số sao",
                    "Rất không hài lòng",
                    "Chưa hài lòng",
                    "Bình thường",
                    "Hài lòng",
                    "Rất hài lòng",
                  ][rating]
                }
              </p>
            </fieldset>
            <label className="content-review-form__content">
              Nội dung đánh giá
              <textarea
                rows={4}
                maxLength={1000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Chia sẻ điều bạn yêu thích hoặc góp ý để trải nghiệm tốt hơn..."
              />
              <small>{content.length}/1000 ký tự</small>
            </label>
            <div className="content-review-form__photo-heading">
              <strong>Ảnh trải nghiệm</strong>
              <span>{photos.length}/3 ảnh</span>
            </div>
            <div className="content-review-form__photos">
              {photos.map((photo, index) => (
                <div key={photo.id || photo.url}>
                  <img src={photo.url} alt={`Ảnh đính kèm ${index + 1}`} />
                  <button
                    type="button"
                    aria-label={`Xóa ảnh ${index + 1}`}
                    onClick={() => {
                      if (photo.file) {
                        URL.revokeObjectURL(photo.url);
                        urls.current.delete(photo.url);
                      }
                      setPhotos((current) =>
                        current.filter((item) => item !== photo),
                      );
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <label className="content-review-form__add-photo">
                  <Camera size={24} />
                  <span>Thêm ảnh</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Thêm ảnh trải nghiệm"
                    onChange={addPhotos}
                  />
                </label>
              )}
            </div>
            <small className="content-review-form__hint">
              JPG, PNG, WebP · Tối đa 5 MB/ảnh
            </small>
          </fieldset>
          {error && (
            <p className="content-reviews__error" role="alert">
              {error}
            </p>
          )}
          <button
            className="content-reviews__primary"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Đang gửi đánh giá..."
              : review
                ? "Lưu thay đổi"
                : "Gửi đánh giá"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
