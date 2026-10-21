import { useEffect, useRef, useState } from "react";
import { MessageSquare, PenLine } from "lucide-react";
import { useNavigate } from "zmp-ui";
import { useCurrentUser } from "@/contexts/auth-context";
import { useContentReviews } from "@/hooks/use-content-reviews";
import { ApiRequestError, getApiErrorMessage } from "@/lib/http-client";
import {
  deleteContentReview,
  getMyContentReview,
  saveContentReview,
} from "@/services/content-reviews";
import { uploadContentImages } from "@/services/media";
import type { ContentReview, ContentReviewType } from "@/types/content-reviews";
import ReviewCard from "./review-card";
import ReviewSummary from "./review-summary";
import ReviewForm, { ReviewFormValue } from "./review-form";
import "@/css/components/content-reviews.css";

export default function ContentReviews(props: {
  targetType: ContentReviewType;
  targetId: string;
  title: string;
}) {
  return (
    <ContentReviewsSection
      key={`${props.targetType}:${props.targetId}`}
      {...props}
    />
  );
}

function ContentReviewsSection({
  targetType,
  targetId,
  title,
}: {
  targetType: ContentReviewType;
  targetId: string;
  title: string;
}) {
  const auth = useCurrentUser();
  const navigate = useNavigate();
  const reviews = useContentReviews(targetType, targetId);
  const [own, setOwn] = useState<ContentReview | null>(null);
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [ownRevision, setOwnRevision] = useState(0);
  const actionLock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setOwn(null);
    if (auth.accessToken) {
      getMyContentReview(
        targetType,
        targetId,
        auth.accessToken,
        controller.signal,
      )
        .then((value) => {
          if (!controller.signal.aborted) setOwn(value);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(getApiErrorMessage(e));
        });
    }
    return () => controller.abort();
  }, [auth.accessToken, targetType, targetId, ownRevision]);

  async function startWriting() {
    if (actionLock.current) return;
    actionLock.current = true;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const token = auth.accessToken || (await auth.authenticate()).accessToken;
      const current = await getMyContentReview(targetType, targetId, token);
      if (alive.current) {
        setOwn(current);
        setEditing(true);
      }
    } catch (e) {
      if (alive.current) setError(getApiErrorMessage(e));
    } finally {
      actionLock.current = false;
      if (alive.current) setWorking(false);
    }
  }

  async function save(value: ReviewFormValue) {
    const token = auth.accessToken || (await auth.authenticate()).accessToken;
    const uploaded = value.files.length
      ? await uploadContentImages(token, value.files)
      : [];
    try {
      const result = await saveContentReview(
        targetType,
        targetId,
        token,
        {
          rating: value.rating,
          content: value.content,
          imageIds: [
            ...value.retainedIds,
            ...uploaded.map((image) => image.id),
          ],
        },
        own?.id,
      );
      if (!alive.current) return;
      setOwn(result);
      setEditing(false);
      setMessage(
        result.status === "HIDDEN"
          ? "Đã lưu thay đổi. Đánh giá hiện vẫn đang được ẩn."
          : "Cảm ơn bạn! Đánh giá đã được lưu.",
      );
      reviews.reload();
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === "REVIEW_ALREADY_EXISTS") {
        const current = await getMyContentReview(targetType, targetId, token);
        if (current && alive.current) {
          setOwn(current);
          setEditing(false);
          setMessage("Bạn đã đánh giá nội dung này. Chọn Sửa đánh giá để cập nhật trải nghiệm của bạn.");
          reviews.reload();
          return;
        }
        throw new Error(
          "Bạn đã đánh giá nội dung này. Vui lòng chỉnh sửa đánh giá hiện có.",
        );
      }
      throw e;
    }
  }

  async function remove() {
    if (!own || actionLock.current) return;
    actionLock.current = true;
    setWorking(true);
    setError("");
    try {
      const token = auth.accessToken || (await auth.authenticate()).accessToken;
      await deleteContentReview(own.id, token);
      if (alive.current) {
        setOwn(null);
        setConfirmDelete(false);
        setMessage("Đã xóa đánh giá của bạn.");
        reviews.reload();
      }
    } catch (e) {
      if (alive.current) setError(getApiErrorMessage(e));
    } finally {
      actionLock.current = false;
      if (alive.current) setWorking(false);
    }
  }

  return (
    <section
      className="content-reviews"
      id="content-reviews"
      aria-label="Đánh giá từ cộng đồng"
    >
      <div className="content-reviews__heading">
        <div>
          <h2>
            <span />
            Đánh giá &amp; trải nghiệm
          </h2>
          <p>Chia sẻ của cộng đồng LocalGo</p>
        </div>
        <button
          className="content-reviews__write"
          type="button"
          disabled={working}
          onClick={startWriting}
        >
          <PenLine size={16} />
          {working ? "Đang xử lý..." : own ? "Sửa đánh giá" : "Viết đánh giá"}
        </button>
      </div>
      {message && (
        <p className="content-reviews__success" role="status">
          {message}
        </p>
      )}
      {error && (
        <div className="content-reviews__error" role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setOwnRevision((value) => value + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      )}
      {reviews.summary && <ReviewSummary summary={reviews.summary} />}
      {own && (
        <div className="content-reviews__own">
          <h3>Đánh giá của bạn</h3>
          <ReviewCard
            review={own}
            own
            onEdit={startWriting}
            onDelete={() => setConfirmDelete(true)}
          />
        </div>
      )}
      {confirmDelete && (
        <div
          className="content-reviews__confirm"
          role="group"
          aria-label="Xác nhận xóa đánh giá"
        >
          <p>Xóa đánh giá và các ảnh đính kèm của bạn?</p>
          <button
            type="button"
            disabled={working}
            onClick={() => setConfirmDelete(false)}
          >
            Giữ lại
          </button>
          <button
            className="is-danger"
            type="button"
            disabled={working}
            onClick={remove}
          >
            {working ? "Đang xóa..." : "Xác nhận xóa"}
          </button>
        </div>
      )}
      <div className="content-reviews__toolbar">
        <h3>Đánh giá cộng đồng</h3>
        <label>
          <span className="content-reviews__sr-only">Sắp xếp đánh giá</span>
          <select
            value={reviews.sort}
            onChange={(event) =>
              reviews.setSort(event.target.value as "asc" | "desc")
            }
          >
            <option value="desc">Mới nhất</option>
            <option value="asc">Cũ nhất</option>
          </select>
        </label>
      </div>
      {reviews.items
        .filter((item) => item.id !== own?.id)
        .map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      {!reviews.loading && !reviews.error && reviews.summary?.total === 0 && (
        <div className="content-reviews__empty">
          <MessageSquare size={30} />
          <strong>Chưa có đánh giá nào</strong>
          <p>Hãy là người đầu tiên chia sẻ trải nghiệm của bạn!</p>
        </div>
      )}
      {reviews.error && (
        <div className="content-reviews__error" role="alert">
          {reviews.error}{" "}
          <button
            type="button"
            onClick={reviews.items.length ? reviews.loadMore : reviews.reload}
          >
            Thử lại
          </button>
        </div>
      )}
      {reviews.loading && (
        <p className="content-reviews__status" role="status">
          Đang tải đánh giá...
        </p>
      )}
      {reviews.meta && reviews.meta.page < reviews.meta.totalPages && (
        <button
          className="content-reviews__more"
          type="button"
          disabled={reviews.loading}
          onClick={reviews.loadMore}
        >
          Xem thêm đánh giá
        </button>
      )}
      <button
        className="content-reviews__history"
        type="button"
        onClick={() => navigate("/reviews/me")}
      >
        Xem tất cả đánh giá của tôi →
      </button>
      {editing && (
        <ReviewForm
          key={own?.id || "new"}
          title={title}
          review={own}
          onClose={() => setEditing(false)}
          onSave={save}
        />
      )}
    </section>
  );
}
