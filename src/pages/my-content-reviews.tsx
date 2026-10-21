import { useEffect, useRef, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";
import { MessageSquare } from "lucide-react";
import { useCurrentUser } from "@/contexts/auth-context";
import { getMyContentReviews } from "@/services/content-reviews";
import { getApiErrorMessage } from "@/lib/http-client";
import type { ContentReview } from "@/types/content-reviews";
import type { PaginationMeta } from "@/types/api";
import ReviewCard from "@/components/content-reviews/review-card";
import placeholder from "@/static/image-placeholder.svg";
import "@/css/components/content-reviews.css";
import "@/css/pages/content-reviews.css";

export default function MyContentReviewsPage() {
  const navigate = useNavigate();
  const { accessToken, authenticate } = useCurrentUser();
  const [items, setItems] = useState<ContentReview[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const controllerRef = useRef<AbortController>();
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setItems([]);
    setMeta(null);
    setError("");
    busy.current = false;
    if (!accessToken) return () => controller.abort();
    setLoading(true);
    busy.current = true;
    getMyContentReviews(accessToken, 1, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setItems(result.items);
          setMeta(result.meta);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          busy.current = false;
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [accessToken, revision]);

  async function login() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      await authenticate();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  async function loadMore() {
    const controller = controllerRef.current;
    if (
      !accessToken ||
      !meta ||
      busy.current ||
      !controller ||
      controller.signal.aborted
    )
      return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await getMyContentReviews(
        accessToken,
        meta.page + 1,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setItems((current) => [
          ...new Map(
            [...current, ...result.items].map((item) => [item.id, item]),
          ).values(),
        ]);
        setMeta(result.meta);
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(e));
    } finally {
      if (!controller.signal.aborted) {
        busy.current = false;
        setLoading(false);
      }
    }
  }

  return (
    <Page className="my-reviews-page">
      <header className="my-reviews-header">
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>TRẢI NGHIỆM LOCALGO</span>
          <h1>Đánh giá của tôi</h1>
        </div>
      </header>
      <main className="my-reviews-content">
        <div className="my-reviews-intro">
          <MessageSquare size={24} />
          <div>
            <strong>Những trải nghiệm bạn đã chia sẻ</strong>
            <p>
              {meta
                ? `${meta.total} đánh giá · Cảm ơn bạn đã góp phần xây dựng cộng đồng.`
                : "Xem lại đánh giá và phản hồi từ ban quản lý."}
            </p>
          </div>
        </div>
        {!accessToken && (
          <div className="content-reviews content-reviews__empty">
            <strong>Đăng nhập để xem đánh giá</strong>
            <p>
              Kết nối tài khoản Zalo để xem những trải nghiệm bạn đã chia sẻ.
            </p>
            <button
              className="content-reviews__primary"
              type="button"
              disabled={loading}
              onClick={login}
            >
              {loading ? "Đang xác thực..." : "Đăng nhập với Zalo"}
            </button>
          </div>
        )}
        {items.map((review) => {
          const target = review.target;
          const available = target && !target.deleted && target.isActive;
          return (
            <section className="my-review-item" key={review.id}>
              <button
                className="my-review-item__target"
                type="button"
                disabled={!available}
                onClick={() =>
                  navigate(
                    `/${review.targetType}/${encodeURIComponent(target?.id || review.targetId)}`,
                  )
                }
              >
                <img src={target?.imageUrl || placeholder} alt="" />
                <span>
                  <strong>
                    {target?.name || "Nội dung không còn tồn tại"}
                  </strong>
                  <small>
                    {available
                      ? "Xem nội dung · Sửa hoặc xóa đánh giá →"
                      : "Nội dung hiện không khả dụng"}
                  </small>
                </span>
              </button>
              <ReviewCard review={review} own />
            </section>
          );
        })}
        {accessToken && !loading && !error && meta?.total === 0 && (
          <div className="content-reviews content-reviews__empty">
            <MessageSquare size={32} />
            <strong>Bạn chưa có đánh giá nào</strong>
            <p>Khám phá một địa điểm và chia sẻ trải nghiệm đầu tiên nhé.</p>
            <button
              className="content-reviews__primary"
              type="button"
              onClick={() => navigate("/")}
            >
              Khám phá LocalGo
            </button>
          </div>
        )}
        {error && (
          <div className="content-reviews__error" role="alert">
            {error}{" "}
            {accessToken && (
              <button
                type="button"
                onClick={
                  items.length
                    ? loadMore
                    : () => setRevision((value) => value + 1)
                }
              >
                Thử lại
              </button>
            )}
          </div>
        )}
        {accessToken && loading && (
          <p className="content-reviews__status" role="status">
            Đang tải đánh giá...
          </p>
        )}
        {meta && meta.page < meta.totalPages && (
          <button
            className="content-reviews__more"
            type="button"
            disabled={loading}
            onClick={loadMore}
          >
            Xem thêm đánh giá
          </button>
        )}
      </main>
    </Page>
  );
}
