import { FormEvent, useEffect, useMemo, useState } from "react";
import { Icon, Modal, Page, useLocation, useNavigate } from "zmp-ui";

import {
  BusinessProfileRequiredDialog,
  TradeLoginRequiredDialog,
} from "@/components/trade-access-dialogs";
import NotificationBell from "@/components/notification-bell";
import { useCurrentUser } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notification-context";
import {
  TradeAnalyticsSummary,
  TradeConversationResponse,
  TradeMessageResponse,
  TradePostRequestError,
  TradePostResponse,
  TradePostStatus,
  TradeReviewResponse,
  deleteTradePost,
  getMyTradeAnalytics,
  getMyTradePosts,
  getOwnerTradeReviews,
  getTradeConversations,
  getTradeMessages,
  isTradePostExpiredError,
  markTradeConversationRead,
  removeTradeReviewReply,
  replyToTradeReview,
  sendTradeMessage,
  submitTradePost,
} from "@/services/trade-posts";
import restaurant from "@/static/restaurant.png";
import "../css/pages/trade-management.css";

type ManagementTab = "overview" | "posts" | "reviews" | "messages";

const STATUS_LABELS: Record<TradePostStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Chờ duyệt",
  PUBLISHED: "Đang hiển thị",
  HIDDEN: "Đang ẩn",
  REJECTED: "Cần chỉnh sửa",
  EXPIRED: "Hết hạn",
  ARCHIVED: "Đã lưu trữ",
};

const emptyAnalytics: TradeAnalyticsSummary = {
  range: { from: "", to: "" },
  postCount: 0,
  totals: {
    views: 0,
    uniqueVisitors: 0,
    contactPhone: 0,
    contactZalo: 0,
    share: 0,
    save: 0,
  },
  reviews: { count: 0 },
  topPosts: [],
  timeseries: [],
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function requestMessage(error: unknown, fallback: string): string {
  return error instanceof TradePostRequestError || error instanceof Error
    ? error.message
    : fallback;
}

function TradeManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    accessToken,
    status: authStatus,
    authenticate,
  } = useCurrentUser();
  const { subscribeToChatMessages } = useNotifications();
  const notificationState = location.state as
    | { initialTab?: ManagementTab; reviewId?: string }
    | null;
  const [activeTab, setActiveTab] = useState<ManagementTab>(
    () => notificationState?.initialTab ?? "overview"
  );
  const [rangeDays, setRangeDays] = useState(30);
  const [posts, setPosts] = useState<TradePostResponse[]>([]);
  const [analytics, setAnalytics] =
    useState<TradeAnalyticsSummary>(emptyAnalytics);
  const [reviews, setReviews] = useState<TradeReviewResponse[]>([]);
  const [conversations, setConversations] = useState<
    TradeConversationResponse[]
  >([]);
  const [messages, setMessages] = useState<TradeMessageResponse[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TradePostStatus>(
    "ALL"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TradePostResponse | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyingReviewId, setReplyingReviewId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const hasBusinessAccess =
    authStatus === "authenticated" &&
    user?.status === "ACTIVE" &&
    user.role === "BUSINESS" &&
    Boolean(accessToken);

  useEffect(() => {
    if (authStatus === "idle" || authStatus === "error") {
      setLoginOpen(true);
    } else if (
      authStatus === "authenticated" &&
      user &&
      (user.status !== "ACTIVE" || user.role !== "BUSINESS")
    ) {
      setBusinessDialogOpen(true);
    }
  }, [authStatus, user]);

  useEffect(() => {
    if (!hasBusinessAccess || !accessToken) return;
    let active = true;
    const to = new Date();
    const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    setIsLoading(true);
    setPageError("");

    Promise.allSettled([
      getMyTradePosts(accessToken, { page: 1, limit: 100 }),
      getMyTradeAnalytics(accessToken, {
        from: from.toISOString(),
        to: to.toISOString(),
      }),
      getOwnerTradeReviews(accessToken, 1, 100),
      getTradeConversations(accessToken),
    ]).then((results) => {
      if (!active) return;
      const [postResult, analyticsResult, reviewResult, conversationResult] =
        results;
      const errors: string[] = [];

      if (postResult.status === "fulfilled") setPosts(postResult.value.items);
      else errors.push(requestMessage(postResult.reason, "Không thể tải tin."));

      if (analyticsResult.status === "fulfilled")
        setAnalytics(analyticsResult.value);
      else
        errors.push(
          requestMessage(analyticsResult.reason, "Không thể tải thống kê.")
        );

      if (reviewResult.status === "fulfilled")
        setReviews(reviewResult.value.items);
      else
        errors.push(
          requestMessage(reviewResult.reason, "Không thể tải đánh giá.")
        );

      if (conversationResult.status === "fulfilled") {
        setConversations(conversationResult.value);
        setSelectedConversationId((current) =>
          conversationResult.value.some((item) => item.id === current)
            ? current
            : (conversationResult.value[0]?.id ?? "")
        );
      } else {
        errors.push(
          requestMessage(
            conversationResult.reason,
            "Không thể tải hội thoại."
          )
        );
      }

      setPageError([...new Set(errors)].join(" "));
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [accessToken, hasBusinessAccess, rangeDays, reloadKey]);

  useEffect(() => {
    if (
      !accessToken ||
      !selectedConversationId ||
      !hasBusinessAccess ||
      activeTab !== "messages"
    ) {
      setMessages([]);
      return;
    }
    let active = true;
    setIsMessagesLoading(true);
    void Promise.all([
      getTradeMessages(accessToken, selectedConversationId, 1, 100),
      markTradeConversationRead(accessToken, selectedConversationId),
    ])
      .then(([result]) => {
        if (!active) return;
        setMessages(result.items);
        setConversations((current) =>
          current.map((item) =>
            item.id === selectedConversationId
              ? { ...item, unreadCount: 0 }
              : item
          )
        );
      })
      .catch((error) => {
        if (active)
          setActionError(requestMessage(error, "Không thể tải tin nhắn."));
      })
      .finally(() => {
        if (active) setIsMessagesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, activeTab, hasBusinessAccess, selectedConversationId]);

  useEffect(() => {
    if (notificationState?.initialTab) {
      setActiveTab(notificationState.initialTab);
    }
  }, [notificationState?.initialTab]);

  useEffect(() => {
    const reviewId = notificationState?.reviewId;
    if (activeTab !== "reviews" || !reviewId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`trade-review-${reviewId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, notificationState?.reviewId, reviews]);

  useEffect(() => {
    return subscribeToChatMessages((event) => {
      const isOpenConversation =
        activeTab === "messages" && selectedConversationId === event.conversationId;
      setConversations((current) => {
        const conversation = current.find(
          (item) => item.id === event.conversationId
        );
        if (!conversation) return current;
        const nextUnreadCount =
          isOpenConversation || event.message.senderId === user?.id
            ? 0
            : conversation.unreadCount + 1;
        return current
          .map((item) =>
            item.id === event.conversationId
              ? {
                  ...item,
                  lastMessage: event.message,
                  lastMessageAt: event.message.createdAt,
                  unreadCount: nextUnreadCount,
                }
              : item
          )
          .sort(
            (left, right) =>
              new Date(right.lastMessageAt).getTime() -
              new Date(left.lastMessageAt).getTime()
          );
      });
      if (isOpenConversation) {
        setMessages((current) =>
          current.some((item) => item.id === event.message.id)
            ? current
            : [...current, event.message]
        );
        if (accessToken && event.message.senderId !== user?.id) {
          void markTradeConversationRead(accessToken, event.conversationId).catch(
            () => undefined
          );
        }
      }
    });
  }, [
    accessToken,
    activeTab,
    selectedConversationId,
    subscribeToChatMessages,
    user?.id,
  ]);

  const filteredPosts = useMemo(
    () =>
      statusFilter === "ALL"
        ? posts
        : posts.filter((post) => post.status === statusFilter),
    [posts, statusFilter]
  );
  const unreadMessages = conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );
  const unrepliedReviews = reviews.filter(
    (review) => !review.replyContent
  ).length;
  const selectedConversation = conversations.find(
    (item) => item.id === selectedConversationId
  );
  const maxDailyViews = Math.max(
    1,
    ...analytics.timeseries.map((point) => point.views)
  );

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const session = await authenticate({ requestUserInfoPermission: true });
      setLoginOpen(false);
      if (
        session.user.status !== "ACTIVE" ||
        session.user.role !== "BUSINESS"
      ) {
        setBusinessDialogOpen(true);
      }
    } catch (error) {
      setLoginError(
        requestMessage(error, "Không thể đăng nhập Zalo. Vui lòng thử lại.")
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !accessToken || isDeleting) return;
    setIsDeleting(true);
    setActionError("");
    try {
      await deleteTradePost(accessToken, deleteTarget.id);
      setPosts((current) =>
        current.filter((post) => post.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setActionError(requestMessage(error, "Không thể xóa tin."));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const sendForReview = async (post: TradePostResponse) => {
    if (!accessToken) return;
    setActionError("");
    try {
      const updated = await submitTradePost(accessToken, post.id);
      setPosts((current) =>
        current.map((item) => (item.id === post.id ? updated : item))
      );
    } catch (error) {
      if (isTradePostExpiredError(error)) {
        navigate(`/trade/manage/posts/${post.id}/edit`, {
          state: {
            flashMessage: "Tin đã quá ngày hết hạn, vui lòng cập nhật.",
          },
        });
        return;
      }
      setActionError(requestMessage(error, "Không thể gửi tin để duyệt."));
    }
  };

  const openReply = (review: TradeReviewResponse) => {
    setReplyingReviewId(review.id);
    setReplyText(review.replyContent ?? "");
    setActionError("");
  };

  const saveReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !replyingReviewId || isSavingReply) return;
    const content = replyText.trim();
    if (!content) {
      setActionError("Vui lòng nhập nội dung phản hồi.");
      return;
    }
    setIsSavingReply(true);
    setActionError("");
    try {
      const updated = await replyToTradeReview(
        accessToken,
        replyingReviewId,
        content
      );
      setReviews((current) =>
        current.map((review) =>
          review.id === updated.id ? updated : review
        )
      );
      setReplyingReviewId("");
      setReplyText("");
    } catch (error) {
      setActionError(requestMessage(error, "Không thể lưu phản hồi."));
    } finally {
      setIsSavingReply(false);
    }
  };

  const deleteReply = async (review: TradeReviewResponse) => {
    if (!accessToken) return;
    setActionError("");
    try {
      const updated = await removeTradeReviewReply(accessToken, review.id);
      setReviews((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (error) {
      setActionError(requestMessage(error, "Không thể xóa phản hồi."));
    }
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !selectedConversationId || isSendingMessage) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const content = String(formData.get("message") ?? "").trim();
    if (!content) return;
    setIsSendingMessage(true);
    setActionError("");
    try {
      const message = await sendTradeMessage(
        accessToken,
        selectedConversationId,
        content
      );
      setMessages((current) => [...current, message]);
      setConversations((current) =>
        current
          .map((item) =>
            item.id === selectedConversationId
              ? {
                  ...item,
                  lastMessage: message,
                  lastMessageAt: message.createdAt,
                }
              : item
          )
          .sort(
            (left, right) =>
              new Date(right.lastMessageAt).getTime() -
              new Date(left.lastMessageAt).getTime()
          )
      );
      form.reset();
    } catch (error) {
      setActionError(requestMessage(error, "Không thể gửi tin nhắn."));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const renderHeader = () => (
    <header className="trade-manager__header">
      <div className="trade-manager__topbar">
        <button type="button" aria-label="Quay lại" onClick={() => navigate(-1)}>
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Kênh người bán</span>
          <h1>Quản lý giao thương</h1>
        </div>
        <NotificationBell className="trade-manager__notification-bell" />
        <button
          className="trade-manager__create"
          type="button"
          onClick={() => navigate("/trade/create")}
        >
          <Icon icon="zi-plus" />
          Đăng tin
        </button>
      </div>
      {user && (
        <div className="trade-manager__identity">
          <span>{user.displayName.charAt(0)}</span>
          <div>
            <strong>{user.displayName}</strong>
            <small>Tài khoản BUSINESS đã xác thực</small>
          </div>
        </div>
      )}
    </header>
  );

  if (!hasBusinessAccess) {
    return (
      <Page className="trade-manager-page">
        {renderHeader()}
        <main className="trade-manager__locked">
          <Icon icon="zi-lock" />
          <h2>Cần đăng nhập tài khoản BUSINESS</h2>
          <p>
            Đăng nhập Zalo bằng tài khoản đã được duyệt để quản lý tin, đánh
            giá và hội thoại khách hàng.
          </p>
          <button type="button" onClick={() => setLoginOpen(true)}>
            Đăng nhập Zalo
          </button>
        </main>
        <TradeLoginRequiredDialog
          visible={loginOpen}
          loading={loginLoading}
          error={loginError}
          onLogin={() => void handleLogin()}
          onClose={() => {
            if (!loginLoading) setLoginOpen(false);
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

  return (
    <Page className="trade-manager-page">
      {renderHeader()}

      <nav className="trade-manager__tabs" aria-label="Khu vực quản lý">
        {(
          [
            ["overview", "Tổng quan", 0],
            ["posts", "Tin đăng", posts.length],
            ["reviews", "Đánh giá", unrepliedReviews],
            ["messages", "Tin nhắn", unreadMessages],
          ] as Array<[ManagementTab, string, number]>
        ).map(([tab, label, count]) => (
          <button
            className={activeTab === tab ? "is-active" : ""}
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            <span>{label}</span>
            {count > 0 && <small>{count > 99 ? "99+" : count}</small>}
          </button>
        ))}
      </nav>

      <main className="trade-manager__content">
        {pageError && (
          <div className="trade-manager__alert" role="alert">
            <span>{pageError}</span>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
              Tải lại
            </button>
          </div>
        )}
        {actionError && (
          <p className="trade-manager__action-error" role="alert">
            {actionError}
          </p>
        )}

        {activeTab === "overview" && (
          <section className="trade-manager__panel">
            <div className="trade-manager__section-heading">
              <div>
                <span>Hiệu quả kinh doanh</span>
                <h2>Tổng quan hoạt động</h2>
              </div>
              <div className="trade-manager__range">
                {[7, 30, 90].map((days) => (
                  <button
                    className={rangeDays === days ? "is-active" : ""}
                    type="button"
                    key={days}
                    onClick={() => setRangeDays(days)}
                  >
                    {days} ngày
                  </button>
                ))}
              </div>
            </div>

            <div className="trade-manager__metrics">
              <article>
                <Icon icon="zi-info-circle" />
                <strong>{formatNumber(analytics.totals.views)}</strong>
                <span>Lượt xem</span>
              </article>
              <article>
                <Icon icon="zi-user" />
                <strong>{formatNumber(analytics.totals.uniqueVisitors)}</strong>
                <span>Khách quan tâm</span>
              </article>
              <article>
                <Icon icon="zi-call" />
                <strong>
                  {formatNumber(
                    analytics.totals.contactPhone +
                      analytics.totals.contactZalo
                  )}
                </strong>
                <span>Lượt liên hệ</span>
              </article>
              <article>
                <Icon icon="zi-star" />
                <strong>{formatNumber(analytics.reviews.count)}</strong>
                <span>Đánh giá</span>
              </article>
            </div>

            <section className="trade-manager__chart-card">
              <div>
                <h3>Xu hướng truy cập</h3>
                <span>{rangeDays} ngày gần nhất</span>
              </div>
              {analytics.timeseries.length > 0 ? (
                <div className="trade-manager__chart" aria-label="Biểu đồ lượt xem">
                  {analytics.timeseries.map((point) => (
                    <div key={point.date} title={`${formatDate(point.date)}: ${point.views} lượt xem`}>
                      <i
                        style={{
                          height: `${Math.max(8, (point.views / maxDailyViews) * 100)}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="trade-manager__empty-copy">
                  Chưa có lượt truy cập trong khoảng thời gian này.
                </p>
              )}
            </section>

            <section className="trade-manager__top-posts">
              <h3>Tin được quan tâm nhiều</h3>
              {analytics.topPosts.map((post, index) => (
                <button
                  type="button"
                  key={post.tradePostId}
                  onClick={() => navigate(`/trade/${post.slug}`)}
                >
                  <b>{index + 1}</b>
                  <img src={post.thumbnailUrl || restaurant} alt="" />
                  <span>{post.title}</span>
                  <strong>{formatNumber(post.views)} xem</strong>
                </button>
              ))}
              {analytics.topPosts.length === 0 && (
                <p className="trade-manager__empty-copy">Chưa có dữ liệu xếp hạng.</p>
              )}
            </section>
          </section>
        )}

        {activeTab === "posts" && (
          <section className="trade-manager__panel">
            <div className="trade-manager__section-heading">
              <div>
                <span>Danh mục của tôi</span>
                <h2>Quản lý tin đăng</h2>
              </div>
              <button type="button" onClick={() => navigate("/trade/create")}>+ Tạo tin</button>
            </div>
            <div className="trade-manager__filters">
              {(
                [
                  ["ALL", "Tất cả"],
                  ["PUBLISHED", "Đang bán"],
                  ["PENDING", "Chờ duyệt"],
                  ["DRAFT", "Bản nháp"],
                  ["REJECTED", "Cần sửa"],
                ] as Array<["ALL" | TradePostStatus, string]>
              ).map(([value, label]) => (
                <button
                  className={statusFilter === value ? "is-active" : ""}
                  type="button"
                  key={value}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="trade-manager__post-list">
              {filteredPosts.map((post) => (
                <article key={post.id}>
                  <img src={post.thumbnailUrl || restaurant} alt="" />
                  <div className="trade-manager__post-body">
                    <div>
                      <span className={`trade-manager__status trade-manager__status--${post.status.toLowerCase()}`}>
                        {STATUS_LABELS[post.status]}
                      </span>
                      <small>{formatDate(post.updatedAt)}</small>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.summary}</p>
                    <div className="trade-manager__post-stats">
                      <span><Icon icon="zi-info-circle" />{post.viewCount} lượt xem</span>
                      <span><Icon icon="zi-star" />{post.reviewCount} đánh giá</span>
                      <span><Icon icon="zi-heart" />{post.saveCount ?? 0} lượt lưu</span>
                    </div>
                    {post.rejectedReason && (
                      <p className="trade-manager__reject-reason">
                        Lý do: {post.rejectedReason}
                      </p>
                    )}
                    <div className="trade-manager__post-actions">
                      {post.status === "PUBLISHED" && (
                        <button type="button" onClick={() => navigate(`/trade/${post.slug}`)}>Xem tin</button>
                      )}
                      {post.status !== "PENDING" && post.status !== "ARCHIVED" && (
                        <button type="button" onClick={() => navigate(`/trade/manage/posts/${post.id}/edit`)}>Chỉnh sửa</button>
                      )}
                      {(post.status === "DRAFT" || post.status === "REJECTED") && (
                        <button className="is-primary" type="button" onClick={() => void sendForReview(post)}>Gửi duyệt</button>
                      )}
                      <button className="is-danger" type="button" onClick={() => setDeleteTarget(post)}>Xóa</button>
                    </div>
                  </div>
                </article>
              ))}
              {!isLoading && filteredPosts.length === 0 && (
                <div className="trade-manager__empty">
                  <Icon icon="zi-note" />
                  <strong>Chưa có tin trong nhóm này</strong>
                  <button type="button" onClick={() => navigate("/trade/create")}>Tạo tin đầu tiên</button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "reviews" && (
          <section className="trade-manager__panel">
            <div className="trade-manager__section-heading">
              <div>
                <span>Chăm sóc khách hàng</span>
                <h2>Đánh giá & phản hồi</h2>
              </div>
              <small>{unrepliedReviews} chưa phản hồi</small>
            </div>
            <div className="trade-manager__review-list">
              {reviews.map((review) => (
                <article id={`trade-review-${review.id}`} key={review.id}>
                  <header>
                    <span className="trade-manager__reviewer-avatar">
                      {review.reviewer?.avatarUrl ? (
                        <img src={review.reviewer.avatarUrl} alt="" />
                      ) : (
                        (review.reviewer?.displayName || "K").charAt(0)
                      )}
                    </span>
                    <div>
                      <strong>{review.reviewer?.displayName || "Khách hàng LocalGo"}</strong>
                      <span className="trade-manager__stars">
                        {Array.from({ length: 5 }, (_, index) => (
                          <i className={index < review.rating ? "is-active" : ""} key={index}>★</i>
                        ))}
                      </span>
                    </div>
                    <time>{formatDate(review.createdAt)}</time>
                  </header>
                  <p>{review.content}</p>
                  <small>Cho tin: {review.tradePost?.title || "Tin giao thương"}</small>
                  {review.replyContent && (
                    <blockquote>
                      <strong>Phản hồi của bạn</strong>
                      <p>{review.replyContent}</p>
                      <div>
                        <button type="button" onClick={() => openReply(review)}>Chỉnh sửa</button>
                        <button type="button" onClick={() => void deleteReply(review)}>Xóa phản hồi</button>
                      </div>
                    </blockquote>
                  )}
                  {!review.replyContent && (
                    <button className="trade-manager__reply-button" type="button" onClick={() => openReply(review)}>
                      Phản hồi đánh giá
                    </button>
                  )}
                  {replyingReviewId === review.id && (
                    <form className="trade-manager__reply-form" onSubmit={saveReply}>
                      <textarea
                        autoFocus
                        maxLength={500}
                        rows={3}
                        value={replyText}
                        placeholder="Cảm ơn khách hàng hoặc hỗ trợ vấn đề được phản ánh..."
                        onChange={(event) => setReplyText(event.target.value)}
                      />
                      <div>
                        <span>{replyText.length}/500</span>
                        <button type="button" onClick={() => setReplyingReviewId("")}>Hủy</button>
                        <button type="submit" disabled={isSavingReply}>{isSavingReply ? "Đang lưu..." : "Đăng phản hồi"}</button>
                      </div>
                    </form>
                  )}
                </article>
              ))}
              {!isLoading && reviews.length === 0 && (
                <div className="trade-manager__empty">
                  <Icon icon="zi-star" />
                  <strong>Chưa có đánh giá được duyệt</strong>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "messages" && (
          <section className="trade-manager__panel trade-manager__messages-panel">
            <div className="trade-manager__section-heading">
              <div>
                <span>Hộp thư giao thương</span>
                <h2>Tin nhắn khách hàng</h2>
              </div>
              <small>{unreadMessages} chưa đọc</small>
            </div>
            <div className="trade-manager__messenger">
              <aside>
                {conversations.map((conversation) => (
                  <button
                    className={conversation.id === selectedConversationId ? "is-active" : ""}
                    type="button"
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <span className="trade-manager__conversation-avatar">
                      {conversation.counterpart.avatarUrl ? (
                        <img src={conversation.counterpart.avatarUrl} alt="" />
                      ) : (
                        conversation.counterpart.displayName.charAt(0)
                      )}
                    </span>
                    <span>
                      <strong>{conversation.counterpart.displayName}</strong>
                      <small>{conversation.tradePost.title}</small>
                      <p>{conversation.lastMessage?.content || "Bắt đầu hội thoại"}</p>
                    </span>
                    {conversation.unreadCount > 0 && <b>{conversation.unreadCount}</b>}
                  </button>
                ))}
                {conversations.length === 0 && (
                  <p className="trade-manager__empty-copy">Chưa có hội thoại.</p>
                )}
              </aside>

              <section className="trade-manager__thread">
                {selectedConversation ? (
                  <>
                    <header>
                      <div>
                        <strong>{selectedConversation.counterpart.displayName}</strong>
                        <span>{selectedConversation.tradePost.title}</span>
                      </div>
                      <button type="button" onClick={() => navigate(`/trade/${selectedConversation.tradePost.slug}`)}>Xem tin</button>
                    </header>
                    <div className="trade-manager__message-list">
                      {isMessagesLoading && <p>Đang tải tin nhắn...</p>}
                      {messages.map((message) => (
                        <article className={message.senderId === user?.id ? "is-mine" : ""} key={message.id}>
                          <p>{message.content}</p>
                          <time>{formatTime(message.createdAt)}</time>
                        </article>
                      ))}
                    </div>
                    <form className="trade-manager__composer" onSubmit={submitMessage}>
                      <input name="message" maxLength={1000} placeholder="Nhập câu trả lời cho khách hàng..." autoComplete="off" />
                      <button type="submit" disabled={isSendingMessage} aria-label="Gửi tin nhắn">
                        <Icon icon="zi-send-solid" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="trade-manager__empty">
                    <Icon icon="zi-chat" />
                    <strong>Chọn một hội thoại để trả lời</strong>
                  </div>
                )}
              </section>
            </div>
          </section>
        )}
      </main>

      <Modal
        visible={Boolean(deleteTarget)}
        title="Xóa tin giao thương?"
        description={deleteTarget ? `Tin “${deleteTarget.title}” sẽ bị thu hồi và không còn hiển thị.` : ""}
        maskClosable={!isDeleting}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        actionsDivider
        actions={[
          { key: "cancel", text: "Hủy", disabled: isDeleting, onClick: () => setDeleteTarget(null) },
          { key: "delete", text: isDeleting ? "Đang xóa..." : "Xóa tin", highLight: true, danger: true, disabled: isDeleting, onClick: () => void confirmDelete() },
        ]}
      />
    </Page>
  );
}

export default TradeManagementPage;
