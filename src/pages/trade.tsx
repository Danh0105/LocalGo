import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import {
  BusinessProfileRequiredDialog,
  TradeLoginRequiredDialog,
} from "@/components/trade-access-dialogs";
import NotificationBell from "@/components/notification-bell";
import { useCurrentUser } from "@/contexts/auth-context";
import { useTradeSaves } from "@/contexts/trade-save-context";
import { useTradePostCategories } from "@/hooks/use-trade-post-categories";
import {
  TRADE_POST_CATEGORY_INVALID_MESSAGE,
  TradePostRequestError,
  TradePostResponse,
  TradePostSortBy,
  getTradePostCategoryName,
  getTradePosts,
  isTradePostCategoryInvalidError,
} from "@/services/trade-posts";
import restaurant from "@/static/restaurant.png";
import tractor from "@/static/tractor.png";
import ocop from "@/static/icon-13.png";
import gps from "@/static/gps.png";
import phone from "@/static/phone.png";
import "../css/pages/trade.css";

const sortOptions: Array<{ value: TradePostSortBy; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp đến cao" },
  { value: "price_desc", label: "Giá cao đến thấp" },
  { value: "rating", label: "Đánh giá cao" },
  { value: "popular", label: "Xem nhiều" },
];

const categoryImages = [restaurant, tractor, gps, ocop];

function postRating(post: TradePostResponse): number {
  const rating = Number(post.averageRating);
  return Number.isFinite(rating) ? rating : 0;
}

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

function postBadge(post: TradePostResponse): string | null {
  if (post.featured) return "Nổi bật";
  if (post.promotionPercent) {
    return `-${post.promotionPercent}%`;
  }
  return null;
}

function postImage(post: TradePostResponse): string {
  return (
    post.images?.[0]?.url ||
    post.thumbnailUrl ||
    post.images?.[0]?.thumbnailUrl ||
    restaurant
  );
}

function TradePage() {
  const navigate = useNavigate();
  const { user, accessToken, status: authStatus, authenticate } = useCurrentUser();
  const { getSaveState, syncTradePosts, toggleSave } = useTradeSaves();
  const {
    categories,
    isLoading: isLoadingCategories,
    error: categoryLoadError,
    reload: reloadCategories,
  } = useTradePostCategories();
  const [activeCategory, setActiveCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<TradePostSortBy>("newest");
  const [posts, setPosts] = useState<TradePostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [createPostError, setCreatePostError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const queryVersionRef = useRef(0);

  const categoryByCode = useMemo(
    () => new Map(categories.map((category) => [category.code, category])),
    [categories]
  );

  useEffect(() => {
    if (
      !isLoadingCategories &&
      activeCategory &&
      !categories.some((category) => category.code === activeCategory)
    ) {
      setActiveCategory("");
    }
  }, [activeCategory, categories, isLoadingCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(keyword.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    queryVersionRef.current += 1;
    setIsLoading(true);
    setIsLoadingMore(false);
    setLoadError("");
    setLoadMoreError("");
    void getTradePosts(
      {
        page: 1,
        limit: 20,
        search: search || undefined,
        category: activeCategory || undefined,
        sortBy,
        sortOrder: "desc",
      },
      controller.signal,
      accessToken
    )
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
        if (isTradePostCategoryInvalidError(error) && activeCategory) {
          setActiveCategory("");
          reloadCategories();
          return;
        }
        setLoadError(
          isTradePostCategoryInvalidError(error)
            ? TRADE_POST_CATEGORY_INVALID_MESSAGE
            : error instanceof TradePostRequestError
              ? error.message
              : "Không thể tải danh sách tin giao thương."
        );
      })
      .then(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [accessToken, activeCategory, reloadCategories, reloadKey, search, sortBy, syncTradePosts]);

  const handleLoadMore = () => {
    if (isLoadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    const queryVersion = queryVersionRef.current;
    setIsLoadingMore(true);
    setLoadMoreError("");
    void getTradePosts(
      {
        page: nextPage,
        limit: 20,
        search: search || undefined,
        category: activeCategory || undefined,
        sortBy,
        sortOrder: "desc",
      },
      undefined,
      accessToken
    )
      .then((result) => {
        if (queryVersion !== queryVersionRef.current) return;
        setPosts((current) => {
          const existingIds = new Set(current.map((post) => post.id));
          return [
            ...current,
            ...result.items.filter((post) => !existingIds.has(post.id)),
          ];
        });
        syncTradePosts(result.items);
        setPage(result.meta.page);
        setTotalPages(result.meta.totalPages);
      })
      .catch((error: unknown) => {
        if (queryVersion !== queryVersionRef.current) return;
        if (isTradePostCategoryInvalidError(error) && activeCategory) {
          setActiveCategory("");
          reloadCategories();
          return;
        }
        setLoadMoreError(
          isTradePostCategoryInvalidError(error)
            ? TRADE_POST_CATEGORY_INVALID_MESSAGE
            : error instanceof TradePostRequestError
              ? error.message
              : "Không thể tải thêm tin giao thương."
        );
      })
      .then(() => {
        if (queryVersion === queryVersionRef.current) {
          setIsLoadingMore(false);
        }
      });
  };

  const handleToggleSave = async (post: TradePostResponse) => {
    if (post.ownerId === user?.id) return;
    setSaveError("");
    try {
      const token = accessToken ?? (await authenticate()).accessToken;
      await toggleSave(post, token);
    } catch (error: unknown) {
      if (
        error instanceof TradePostRequestError &&
        error.status === 404 &&
        error.code === "RESOURCE_NOT_FOUND"
      ) {
        setPosts((current) => current.filter((item) => item.id !== post.id));
        setSaveError("Tin không còn hiển thị.");
        return;
      }
      setSaveError(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật tin đã lưu. Vui lòng thử lại."
      );
    }
  };

  const openCreatePost = () => {
    if (isRequestingPermission) return;

    setCreatePostError("");
    setLoginError("");
    if (authStatus !== "authenticated" || !user) {
      setLoginDialogOpen(true);
      return;
    }

    if (user.status !== "ACTIVE") {
      setCreatePostError(
        "Tài khoản của bạn chưa hoạt động. Vui lòng liên hệ quản trị viên."
      );
      return;
    }

    if (user.role !== "BUSINESS") {
      setBusinessDialogOpen(true);
      return;
    }

    navigate("/trade/create");
  };

  const handleLoginForCreatePost = async () => {
    if (isRequestingPermission) return;

    setLoginError("");
    setIsRequestingPermission(true);
    try {
      const currentUser = (
        await authenticate({ requestUserInfoPermission: true })
      ).user;
      setLoginDialogOpen(false);

      if (currentUser.status !== "ACTIVE") {
        setCreatePostError(
          "Tài khoản của bạn chưa hoạt động. Vui lòng liên hệ quản trị viên."
        );
      } else if (currentUser.role === "BUSINESS") {
        navigate("/trade/create");
      } else {
        setBusinessDialogOpen(true);
      }
    } catch {
      setLoginError(
        "Bạn cần cấp quyền truy cập thông tin Zalo để sử dụng tính năng đăng tin."
      );
    } finally {
      setIsRequestingPermission(false);
    }
  };

  return (
    <Page className="trade-page">
      <header className="trade-header">
        <div className="trade-header__bar">
          <button
            className="trade-back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <div>
            <p>Kết nối cộng đồng</p>
            <h1>Giao thương</h1>
          </div>
        </div>

        <div className="trade-header__actions">
          {authStatus === "authenticated" && user && (
            <button
              className="trade-saved-header-button"
              type="button"
              aria-label="Tin đã lưu"
              onClick={() => navigate("/trade/saved")}
            >
              <Icon icon="zi-bookmark" />
            </button>
          )}
          <NotificationBell
            alwaysVisible
            prominent
            className="trade-notification-bell"
          />
        </div>

        <p className="trade-header__description">
          Kết nối người dân, hộ kinh doanh, doanh nghiệp và du khách; cùng quảng
          bá sản phẩm địa phương và mở rộng cơ hội hợp tác.
        </p>

        <label className="trade-search">
          <Icon icon="zi-search" />
          <input
            type="search"
            value={keyword}
            placeholder="Tìm sản phẩm, dịch vụ, đối tác..."
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
      </header>

      <main className="trade-content">
        {categoryLoadError && (
          <div className="trade-categories-error" role="alert">
            <span>{categoryLoadError}</span>
            <button type="button" onClick={reloadCategories}>
              Thử lại
            </button>
          </div>
        )}
        {isLoadingCategories && (
          <p className="trade-categories-loading">Đang tải danh mục...</p>
        )}
        {!isLoadingCategories && categories.length > 0 && (
          <section
            className="trade-quick-grid"
            aria-label="Danh mục giao thương"
          >
            {categories.map((category, index) => (
              <button
                className="trade-quick-card"
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.code)}
              >
                <span className="trade-quick-card__image">
                  <img
                    src={categoryImages[index % categoryImages.length]}
                    alt=""
                  />
                </span>
                <strong>{category.name}</strong>
                <small>
                  {category.description || "Tin giao thương địa phương"}
                </small>
              </button>
            ))}
          </section>
        )}

        <section className="trade-section">
          <div className="trade-section__heading">
            <div>
              <span className="trade-section__eyebrow">Khám phá cơ hội</span>
              <h2>Tin giao thương mới</h2>
            </div>
            <div className="trade-section__actions">
              {authStatus === "authenticated" && user && (
                <button
                  className="trade-saved-tag"
                  type="button"
                  onClick={() => navigate("/trade/saved")}
                >
                  <Icon icon="zi-bookmark" />
                  Tin đã lưu
                </button>
              )}
              {authStatus === "authenticated" &&
                user?.status === "ACTIVE" &&
                user.role === "BUSINESS" && (
                  <button
                    className="trade-management-tag"
                    type="button"
                    onClick={() => navigate("/trade/manage")}
                  >
                    <Icon icon="zi-setting" />
                    Quản lý tin giao thương
                  </button>
                )}
              <button
                className="trade-create-button"
                type="button"
                disabled={isRequestingPermission}
                onClick={openCreatePost}
              >
                Đăng tin
              </button>
            </div>
          </div>
          {createPostError && (
            <p className="trade-action-error">{createPostError}</p>
          )}
          {saveError && <p className="trade-action-error">{saveError}</p>}

          <div className="trade-filter-row">
            <div className="trade-filters">
              <button
                className={`trade-filter${
                  activeCategory === "" ? " trade-filter--active" : ""
                }`}
                type="button"
                onClick={() => setActiveCategory("")}
              >
                Tất cả
              </button>
              {categories.map((category) => (
                <button
                  className={`trade-filter${
                    category.code === activeCategory
                      ? " trade-filter--active"
                      : ""
                  }`}
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.code)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <label className="trade-sort">
              <span>Sắp xếp</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as TradePostSortBy)}
              >
                {sortOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="trade-list">
            {!isLoading &&
              !loadError &&
              posts.map((post) => {
                const rating = postRating(post);
                const badge = postBadge(post);
                const saveState = getSaveState(post);
                const canSave = post.ownerId !== user?.id;
                return (
                  <article
                    className="trade-card"
                    key={post.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/trade/${post.slug || post.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        navigate(`/trade/${post.slug || post.id}`);
                      }
                    }}
                  >
                    <div className="trade-card__image">
                      <img
                        src={postImage(post)}
                        alt={post.title}
                        onError={(event) => {
                          event.currentTarget.src = restaurant;
                        }}
                      />
                      {badge && <span>{badge}</span>}
                    </div>
                    <div className="trade-card__body">
                      <span className="trade-card__category">
                        {getTradePostCategoryName(
                          post.category,
                          post.categoryInfo || categoryByCode.get(post.category)
                        )}
                      </span>
                      <h3>{post.title}</h3>
                      <p className="trade-card__owner">
                        {post.owner?.displayName || post.contactName}
                      </p>
                      <div
                        className="trade-card__rating"
                        aria-label={`${rating} trên 5 sao`}
                      >
                        <span>★</span>
                        <strong>{rating.toFixed(1)}</strong>
                        <small>({post.reviewCount} đánh giá)</small>
                        <small>· {post.viewCount} lượt xem</small>
                      </div>
                      <p className="trade-card__summary">{post.summary}</p>
                      <div className="trade-card__footer">
                        <span>{post.address}</span>
                        <strong>{postPrice(post)}</strong>
                      </div>
                    </div>
                    <button
                      className={`trade-card__save${
                        saveState.isSaved ? " is-saved" : ""
                      }`}
                      type="button"
                      aria-label={saveState.isSaved ? "Bỏ lưu tin" : "Lưu tin"}
                      aria-pressed={saveState.isSaved}
                      disabled={saveState.isSaving}
                      hidden={!canSave}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleSave(post);
                      }}
                    >
                      <Icon icon="zi-bookmark" />
                    </button>
                    <button
                      className="trade-card__contact"
                      type="button"
                      aria-label="Liên hệ"
                      onClick={(event) => {
                        event.stopPropagation();
                        window.location.href = `tel:${post.contactPhone}`;
                      }}
                    >
                      <img src={phone} alt="" />
                    </button>
                  </article>
                );
              })}

            {isLoading && (
              <div className="trade-empty">
                <Icon icon="zi-clock-1" />
                <strong>Đang tải tin giao thương</strong>
                <span>Vui lòng chờ trong giây lát.</span>
              </div>
            )}

            {!isLoading && loadError && (
              <div className="trade-empty">
                <Icon icon="zi-warning" />
                <strong>Chưa thể tải tin giao thương</strong>
                <span>{loadError}</span>
                <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                  Thử lại
                </button>
              </div>
            )}

            {!isLoading && !loadError && posts.length === 0 && (
              <div className="trade-empty">
                <Icon icon="zi-search" />
                <strong>Chưa tìm thấy kết quả</strong>
                <span>Thử từ khóa, danh mục hoặc cách sắp xếp khác.</span>
              </div>
            )}

            {!isLoading && !loadError && posts.length > 0 && page < totalPages && (
              <button
                className="trade-load-more"
                type="button"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
              >
                {isLoadingMore ? "Đang tải..." : "Xem thêm tin giao thương"}
              </button>
            )}

            {loadMoreError && (
              <div className="trade-load-more-error">
                <span>{loadMoreError}</span>
                <button type="button" onClick={handleLoadMore}>Thử lại</button>
              </div>
            )}
          </div>
        </section>
      </main>

      <TradeLoginRequiredDialog
        visible={loginDialogOpen}
        loading={isRequestingPermission}
        error={loginError}
        onLogin={() => void handleLoginForCreatePost()}
        onClose={() => {
          if (!isRequestingPermission) setLoginDialogOpen(false);
        }}
      />
      <BusinessProfileRequiredDialog
        visible={businessDialogOpen}
        zaloId={user?.zaloId}
        onClose={() => setBusinessDialogOpen(false)}
      />
    </Page>
  );
}

export default TradePage;
