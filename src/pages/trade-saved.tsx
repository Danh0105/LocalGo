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

function categoryLabel(post: SavedTradePostResponse): string {
  return post.categoryInfo?.name || post.category || "Giao thương";
}

function SavedTradePostsPage() {
  const navigate = useNavigate();
  const { accessToken, status, authenticate, user } = useCurrentUser();
  const { getSaveState, syncTradePosts, toggleSave } = useTradeSaves();
  const [posts, setPosts] = useState<SavedTradePostResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
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
        setTotalItems(result.meta.total);
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
      setTotalItems(result.meta.total);
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
      setTotalItems(result.meta.total);
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
        setTotalItems((current) => Math.max(0, current - 1));
      }
    } catch (error: unknown) {
      if (error instanceof TradePostRequestError && error.status === 404) {
        setPosts((current) => current.filter((item) => item.id !== post.id));
        setTotalItems((current) => Math.max(0, current - 1));
      }
    }
  };

  if (status !== "authenticated" || !accessToken) {
    return (
      <Page className="trade-saved-page">
        <header className="trade-saved-header">
          <button className="trade-saved-header__back" type="button" aria-label="Quay lại" onClick={() => navigate(-1)}>
            <Icon icon="zi-arrow-left" />
          </button>
          <div className="trade-saved-header__copy">
            <span>Giao thương</span>
            <h1>Tin đã lưu</h1>
          </div>
        </header>
        <main className="trade-saved-content trade-saved-login">
          <div className="trade-saved-empty">
            <span className="trade-saved-empty__icon"><Icon icon="zi-bookmark" /></span>
            <span className="trade-saved-empty__eyebrow">Bộ sưu tập cá nhân</span>
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
        <button className="trade-saved-header__back" type="button" aria-label="Quay lại" onClick={() => navigate(-1)}>
          <Icon icon="zi-arrow-left" />
        </button>
        <div className="trade-saved-header__copy">
          <span>Bộ sưu tập của bạn</span>
          <h1>Tin đã lưu</h1>
        </div>
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
        <section className="trade-saved-overview" aria-label="Tổng quan tin đã lưu">
          <span className="trade-saved-overview__icon" aria-hidden="true">
            <Icon icon="zi-bookmark" />
          </span>
          <div>
            <span>Danh sách quan tâm</span>
            <h2>{totalItems} tin đã lưu</h2>
            <p>Mở lại nhanh những sản phẩm và dịch vụ bạn đang quan tâm.</p>
          </div>
        </section>

        <div className="trade-saved-toolbar">
          <strong>{posts.length > 0 ? "Mới lưu gần đây" : "Bộ sưu tập của bạn"}</strong>
          <span>{isRefreshing ? "Đang làm mới…" : "Kéo xuống để làm mới"}</span>
        </div>

        {isLoading && (
          <section className="trade-saved-skeleton-list" aria-label="Đang tải tin đã lưu" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div className="trade-saved-skeleton" key={item}>
                <span />
                <div><i /><i /><i /></div>
              </div>
            ))}
          </section>
        )}

        {!isLoading && loadError && posts.length === 0 && (
          <div className="trade-saved-empty">
            <span className="trade-saved-empty__icon"><Icon icon="zi-warning" /></span>
            <span className="trade-saved-empty__eyebrow">Đường truyền gián đoạn</span>
            <h2>Chưa thể tải tin đã lưu</h2>
            <p>{loadError}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</button>
          </div>
        )}

        {!isLoading && !loadError && posts.length === 0 && (
          <div className="trade-saved-empty">
            <span className="trade-saved-empty__icon"><Icon icon="zi-bookmark" /></span>
            <span className="trade-saved-empty__eyebrow">Chưa có nội dung</span>
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
                >
                  <button
                    className="trade-saved-card__open"
                    type="button"
                    disabled={!post.isAvailable}
                    onClick={() => navigate(`/trade/${post.slug || post.id}`)}
                  >
                    <span className="trade-saved-card__media">
                      <img
                        className="trade-saved-card__image"
                        src={postImage(post)}
                        alt=""
                        onError={(event) => { event.currentTarget.src = restaurant; }}
                      />
                      <span className="trade-saved-card__category">{categoryLabel(post)}</span>
                    </span>
                    <span className="trade-saved-card__body">
                      {!post.isAvailable && <span className="trade-saved-card__unavailable">Tin không còn hiển thị</span>}
                      <h2>{post.title}</h2>
                      <span className="trade-saved-card__owner">
                        {post.owner?.displayName || post.contactName || "Người đăng tin"}
                      </span>
                      <span className="trade-saved-card__address">
                        <Icon icon="zi-location" />
                        {post.address || "Truông Mít"}
                      </span>
                      <span className="trade-saved-card__footer">
                        <strong>{postPrice(post)}</strong>
                        <small>{savedAgo(post.savedAt)}</small>
                      </span>
                    </span>
                  </button>
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
                      <Icon icon="zi-bookmark-delete" />
                    </button>
                  )}
                </article>
              );
            })}
            <div className="trade-saved-load-more" ref={loadMoreTarget}>
              {isLoadingMore && "Đang tải thêm…"}
              {!isLoadingMore && page < totalPages && "Cuộn để tải thêm"}
              {!isLoadingMore && page >= totalPages && posts.length > 0 && "Bạn đã xem hết danh sách"}
            </div>
            {loadError && <p className="trade-saved-error" role="alert">{loadError}</p>}
          </section>
        )}
      </main>
    </Page>
  );
}

export default SavedTradePostsPage;
