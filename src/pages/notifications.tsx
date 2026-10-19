import { TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { useCurrentUser } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notification-context";
import {
  AppNotification,
  getNotifications,
  NotificationMeta,
  NotificationRequestError,
} from "@/services/notifications";
import "../css/pages/notifications.css";

const emptyMeta: NotificationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

function relativeTime(value: string): string {
  const difference = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(difference) || difference < 0) return "Vừa xong";
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function notificationError(error: unknown): string {
  return error instanceof NotificationRequestError || error instanceof Error
    ? error.message
    : "Không thể tải thông báo.";
}

function mergeNewest(
  current: AppNotification[],
  incoming: AppNotification[]
): AppNotification[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return [...byId.values()].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { accessToken, status, authenticate } = useCurrentUser();
  const {
    latestNotification,
    markAllAsRead,
    markAsRead,
    openNotification,
  } = useNotifications();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [meta, setMeta] = useState<NotificationMeta>(emptyMeta);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState("");
  const touchStartY = useRef<number | null>(null);

  const loadPage = useCallback(
    async (page: number, replace: boolean, refreshing = false) => {
      if (!accessToken) return;
      if (replace) setIsLoading(!refreshing);
      else setIsLoadingMore(true);
      if (refreshing) setIsRefreshing(true);
      setError("");
      try {
        const result = await getNotifications(accessToken, {
          page,
          limit: 20,
          unreadOnly,
        });
        setItems((current) =>
          replace ? result.items : mergeNewest(current, result.items)
        );
        setMeta(result.meta);
      } catch (requestError) {
        setError(notificationError(requestError));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [accessToken, unreadOnly]
  );

  useEffect(() => {
    if (status === "authenticated" && accessToken) {
      void loadPage(1, true);
    }
  }, [accessToken, loadPage, status]);

  useEffect(() => {
    if (!latestNotification || (unreadOnly && latestNotification.readAt)) return;
    setItems((current) => mergeNewest(current, [latestNotification]));
  }, [latestNotification, unreadOnly]);

  const refresh = () => {
    if (isRefreshing || !accessToken) return;
    void loadPage(1, true, true);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartY.current;
    touchStartY.current = null;
    const end = event.changedTouches[0]?.clientY;
    if (start !== null && end !== undefined && end - start > 68) refresh();
  };

  const handleOpen = async (notification: AppNotification) => {
    setError("");
    try {
      if (!notification.readAt) {
        await markAsRead(notification.id);
        setItems((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, readAt: new Date().toISOString() }
              : item
          )
        );
      }
      await openNotification(notification);
    } catch (requestError) {
      setError(notificationError(requestError));
    }
  };

  const handleMarkAll = async () => {
    if (!accessToken || isMarkingAll) return;
    setIsMarkingAll(true);
    setError("");
    try {
      await markAllAsRead();
      setItems((current) =>
        current.map((item) =>
          item.readAt ? item : { ...item, readAt: new Date().toISOString() }
        )
      );
    } catch (requestError) {
      setError(notificationError(requestError));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const signIn = async () => {
    setLoginError("");
    try {
      await authenticate();
    } catch (requestError) {
      setLoginError(notificationError(requestError));
    }
  };

  if (status !== "authenticated" || !accessToken) {
    return (
      <Page className="notifications-page">
        <header className="notifications-header">
          <button
            className="notifications-header__back"
            type="button"
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
          >
            <Icon icon="zi-arrow-left" />
          </button>
          <div>
            <span>Trung tâm cập nhật</span>
            <h1>Thông báo</h1>
          </div>
        </header>
        <main className="notifications-empty notifications-login">
          <Icon icon="zi-lock" />
          <strong>Đăng nhập để xem thông báo</strong>
          <span>{loginError || "Các cập nhật về hồ sơ, tin giao thương và đánh giá sẽ xuất hiện tại đây."}</span>
          <button type="button" onClick={() => void signIn()}>
            Đăng nhập Zalo
          </button>
        </main>
      </Page>
    );
  }

  return (
    <Page
      className="notifications-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="notifications-header">
        <button
          className="notifications-header__back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Trung tâm cập nhật</span>
          <h1>Thông báo</h1>
        </div>
        <button
          className="notifications-header__all-read"
          type="button"
          disabled={isMarkingAll || items.every((item) => item.readAt)}
          onClick={() => void handleMarkAll()}
        >
          {isMarkingAll ? "Đang xử lý..." : "Đọc tất cả"}
        </button>
      </header>

      <main className="notifications-content">
        <div className="notifications-toolbar">
          <button
            className={unreadOnly ? "is-active" : ""}
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly((value) => !value)}
          >
            <Icon icon="zi-filter" />
            Chưa đọc
          </button>
          <button type="button" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? "Đang làm mới" : "Làm mới"}
          </button>
        </div>

        {isRefreshing && <p className="notifications-pull-hint">Đang đồng bộ thông báo...</p>}
        {error && <p className="notifications-error" role="alert">{error}</p>}
        {isLoading && <p className="notifications-loading">Đang tải thông báo...</p>}

        {!isLoading && items.length === 0 && !error && (
          <section className="notifications-empty">
            <Icon icon="zi-notif" />
            <strong>{unreadOnly ? "Không còn thông báo chưa đọc" : "Chưa có thông báo"}</strong>
            <span>Kéo xuống để đồng bộ lại khi có cập nhật mới.</span>
          </section>
        )}

        <section className="notifications-list" aria-label="Danh sách thông báo">
          {items.map((notification) => (
            <button
              className={`notification-row ${notification.readAt ? "" : "is-unread"}`.trim()}
              type="button"
              key={notification.id}
              onClick={() => void handleOpen(notification)}
            >
              <span className="notification-row__icon"><Icon icon="zi-notif" /></span>
              <span className="notification-row__content">
                <strong>{notification.title}</strong>
                <span>{notification.body}</span>
                <time>{relativeTime(notification.createdAt)}</time>
              </span>
              {!notification.readAt && <i aria-label="Chưa đọc" />}
            </button>
          ))}
        </section>

        {meta.page < meta.totalPages && (
          <button
            className="notifications-load-more"
            type="button"
            disabled={isLoadingMore}
            onClick={() => void loadPage(meta.page + 1, false)}
          >
            {isLoadingMore ? "Đang tải..." : "Xem thêm thông báo"}
          </button>
        )}
      </main>
    </Page>
  );
}
