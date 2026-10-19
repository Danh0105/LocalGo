import { TouchEvent, useEffect, useRef, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { useCurrentUser } from "@/contexts/auth-context";
import { useTradeSaves } from "@/contexts/trade-save-context";
import {
  SavedTradePostResponse,
  TradePostRequestError,
  getSavedTradePosts,
} from "@/services/trade-posts";
import restaurant from "@/static/restaurant.png";
import "../css/pages/trade-saved.css";

const PAGE_SIZE = 20;

function postImage(post: SavedTradePostResponse): string {
  return (
    post.images?.[0]?.url ||
    post.thumbnailUrl ||
    post.images?.[0]?.thumbnailUrl ||
    restaurant
  );
}

function postPrice(post: SavedTradePostResponse): string {
  const extra = post as SavedTradePostResponse & { isNonProfit?: boolean };
  if (extra.isNonProfit || post.priceType === ("NON_PROFIT" as never)) {
    return "Phi lợi nhuận";
  }
  if (post.priceLabel) return post.priceLabel;
  if (post.priceType === "NEGOTIABLE") return "Thỏa thuận";
  if (post.priceType === "CONTACT") return "Liên hệ báo giá";
  if (!post.price) return "Liên hệ";
  const price = Number(post.price);
  return Number.isFinite(price)
    ? `${new Intl.NumberFormat("vi-VN").format(price)}đ`
    : "Liên hệ";
}

function savedAgo(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Đã lưu gần đây";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Đã lưu vừa xong";
  if (minutes < 60) return `Đã lưu ${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Đã lưu ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Đã lưu ${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Đã lưu ${months} tháng trước`;
  return `Đã lưu ${Math.floor(months / 12)} năm trước`;
}

function SavedTradePostsPage() {
  const navigate = useNavigate();
  const { accessToken, status, authenticate, user } = useCurrentUser();
  const { getSaveState, syncTradePosts, toggleSave } = useTradeSaves();
  const [posts, setPosts] = useState<SavedTradePostResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const loadMoreTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      setPosts([]);
      setIsLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError("");
    void getSavedTradePosts(accessToken, 1, PAGE_SIZE, controller.signal)
      .then((result) => {
        if (!active) return;
        setPosts(result.items);
        syncTradePosts(result.items);
        setPage(result.meta.page);
        setTotalPages(result.meta.totalPages);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setPosts([]);
        setLoadError(
          error instanceof TradePostRequestError
            ? error.message
            : "Không thể tải tin đã lưu. Vui lòng thử lại."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [accessToken, reloadKey, status, syncTradePosts]);

  const loadMore = async () => {
    if (!accessToken || isLoading || isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    setLoadError("");
    try {
      const result = await getSavedTradePosts(accessToken, page + 1, PAGE_SIZE);
      setPosts((current) => {
        const existingIds = new Set(current.map((post) => post.id));
        return [...current, ...result.items.filter((post) => !existingIds.has(post.id))];
      });
      syncTradePosts(result.items);
      setPage(result.meta.page);
      setTotalPages(result.meta.totalPages);
    } catch (error: unknown) {
      setLoadError(
        error instanceof TradePostRequestError
          ? error.message
          : "Không thể tải thêm tin đã lưu."
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const target = loadMoreTarget.current;
    if (!target || !accessToken || page >= totalPages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "220px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [accessToken, isLoading, isLoadingMore, page, totalPages]);

  const refresh = async () => {
    if (!accessToken || isRefreshing) return;
    setIsRefreshing(true);
    setLoadError("");
    try {
      const result = await getSavedTradePosts(accessToken, 1, PAGE_SIZE);
      setPosts(result.items);
      syncTradePosts(result.items);
      setPage(result.meta.page);
      setTotalPages(result.meta.totalPages);
    } catch (error: unknown) {
      setLoadError(
        error instanceof TradePostRequestError
          ? error.message
          : "Không thể làm mới tin đã lưu."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (window.scrollY === 0) {
      touchStartY.current = event.touches[0]?.clientY ?? null;
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const startY = touchStartY.current;
    touchStartY.current = null;
    const endY = event.changedTouches[0]?.clientY ?? startY;
    if (startY !== null && endY - startY > 72) void refresh();
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      await authenticate();
    } catch (error: unknown) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Không thể đăng nhập Zalo. Vui lòng thử lại."
      );
    }
  };

  const handleUnsave = async (post: SavedTradePostResponse) => {
    try {
      const result = await toggleSave(post);
      if (!result.isSaved) {
        setPosts((current) => current.filter((item) => item.id !== post.id));
      }
    } catch (error: unknown) {
      if (error instanceof TradePostRequestError && error.status === 404) {
        setPosts((current) => current.filter((item) => item.id !== post.id));
      }
    }
  };

  if (status !== "authenticated" || !accessToken) {
    return (
      <Page className="trade-saved-page">
        <header className="trade-saved-header">
          <button type="button" aria-label="Quay lại" onClick={() => navigate(-1)}>
            <Icon icon="zi-arrow-left" />
          </button>
          <div><span>Giao thương</span><h1>Tin đã lưu</h1></div>
        </header>
        <main className="trade-saved-content trade-saved-login">
          <div className="trade-saved-empty">
            <span className="trade-saved-empty__icon"><Icon icon="zi-bookmark" /></span>
            <h2>Đăng nhập để xem tin đã lưu</h2>
            <p>Tin bạn lưu sẽ được đồng bộ an toàn với tài khoản Zalo.</p>
            {loginError && <p className="trade-saved-error" role="alert">{loginError}</p>}
            <button type="button" onClick={() => void handleLogin()}>Đăng nhập Zalo</button>
          </div>
        </main>
      </Page>
    );
  }

  return (
    <Page className="trade-saved-page" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <header className="trade-saved-header">
        <button type="button" aria-label="Quay lại" onClick={() => navigate(-1)}>
          <Icon icon="zi-arrow-left" />
        </button>
        <div><span>Danh sách của bạn</span><h1>Tin đã lưu</h1></div>
        <button
          className="trade-saved-header__refresh"
          type="button"
          aria-label="Làm mới"
          disabled={isRefreshing}
          onClick={() => void refresh()}
        >
          Làm mới
        </button>
      </header>

      <main className="trade-saved-content">
        <p className="trade-saved-hint">
          {isRefreshing ? "Đang làm mới…" : "Kéo xuống để làm mới danh sách"}
        </p>

        {isLoading && (
          <div className="trade-saved-empty">
            <span className="trade-saved-empty__icon"><Icon icon="zi-clock-1" /></span>
            <h2>Đang tải tin đã lưu</h2>
            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {!isLoading && loadError && posts.length === 0 && (
          <div className="trade-saved-empty">
            <span className="trade-saved-empty__icon"><Icon icon="zi-warning" /></span>
            <h2>Chưa thể tải tin đã lưu</h2>
            <p>{loadError}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button>
          </div>
        )}

        {!isLoading && !loadError && posts.length === 0 && (
          <div className="trade-saved-empty">
            <span className="trade-saved-empty__icon"><Icon icon="zi-bookmark" /></span>
            <h2>Bạn chưa lưu tin nào</h2>
            <p>Lưu những tin bạn quan tâm để tìm lại nhanh hơn.</p>
            <button type="button" onClick={() => navigate("/trade")}>Khám phá tin giao thương</button>
          </div>
        )}

        {posts.length > 0 && (
          <section className="trade-saved-list" aria-label="Danh sách tin đã lưu">
            {posts.map((post) => {
              const saveState = getSaveState(post);
              const canUnsave = post.ownerId !== user?.id;
              return (
                <article
                  className={`trade-saved-card${post.isAvailable ? "" : " is-unavailable"}`}
                  key={post.id}
                  role={post.isAvailable ? "button" : undefined}
                  tabIndex={post.isAvailable ? 0 : undefined}
                  onClick={() => {
                    if (post.isAvailable) navigate(`/trade/${post.slug || post.id}`);
                  }}
                  onKeyDown={(event) => {
                    if (post.isAvailable && (event.key === "Enter" || event.key === " ")) {
                      navigate(`/trade/${post.slug || post.id}`);
                    }
                  }}
                >
                  <img
                    className="trade-saved-card__image"
                    src={postImage(post)}
                    alt={post.title}
                    onError={(event) => { event.currentTarget.src = restaurant; }}
                  />
                  <div className="trade-saved-card__body">
                    {!post.isAvailable && <span className="trade-saved-card__unavailable">Tin không còn hiển thị</span>}
                    <h2>{post.title}</h2>
                    <strong>{postPrice(post)}</strong>
                    <span>{savedAgo(post.savedAt)}</span>
                  </div>
                  {canUnsave && (
                    <button
                      className="trade-saved-card__unsave"
                      type="button"
                      aria-label="Bỏ lưu tin"
                      disabled={saveState.isSaving}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleUnsave(post);
                      }}
                    >
                      <Icon icon="zi-bookmark" />
                    </button>
                  )}
                </article>
              );
            })}
            <div className="trade-saved-load-more" ref={loadMoreTarget}>
              {isLoadingMore && "Đang tải thêm…"}
              {!isLoadingMore && page < totalPages && "Cuộn để tải thêm"}
              {!isLoadingMore && page >= totalPages && "Đã hiển thị tất cả tin đã lưu"}
            </div>
            {loadError && <p className="trade-saved-error" role="alert">{loadError}</p>}
          </section>
        )}
      </main>
    </Page>
  );
}

export default SavedTradePostsPage;
