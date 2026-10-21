import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSnackbar } from "zmp-ui";
import { CONTENT_REVIEW_TYPES } from "@/types/content-reviews";

import NotificationAlert from "@/components/notification-alert";
import { useCurrentUser } from "@/contexts/auth-context";
import {
  ChatMessageEvent,
  createNotificationSocket,
} from "@/services/notification-socket";
import {
  AppNotification,
  getNotification,
  getUnreadNotificationCount,
  isNotificationTradePostUnavailable,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationRequestError,
  TRADE_POST_UNAVAILABLE_MESSAGE,
} from "@/services/notifications";
import { getTradePostDetail, TradePostRequestError } from "@/services/trade-posts";

type ChatMessageListener = (event: ChatMessageEvent) => void;

interface NotificationContextValue {
  unreadCount: number;
  latestNotification: AppNotification | null;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  openNotification: (notification: AppNotification) => Promise<void>;
  subscribeToChatMessages: (listener: ChatMessageListener) => () => void;
}

interface NotificationRouteState {
  reason?: string;
  reviewId?: string;
  initialTab?: "overview" | "posts" | "reviews" | "messages";
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

function dataValue(data: AppNotification["data"], ...keys: string[]): string {
  if (!data) return "";
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

function isTradePostType(type: string, suffix: string): boolean {
  return type === suffix || type === `TRADE_POST_${suffix}`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const { accessToken, status, refreshSession, refreshUser } = useCurrentUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] =
    useState<AppNotification | null>(null);
  const [alertNotification, setAlertNotification] =
    useState<AppNotification | null>(null);
  const accessTokenRef = useRef<string | null>(accessToken);
  const chatListenersRef = useRef(new Set<ChatMessageListener>());

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    if (!alertNotification) return;
    const timeout = window.setTimeout(() => setAlertNotification(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [alertNotification]);

  const refreshUnreadCount = useCallback(async () => {
    const token = accessTokenRef.current;
    if (!token) {
      setUnreadCount(0);
      return;
    }
    const count = await getUnreadNotificationCount(token);
    setUnreadCount(count);
  }, []);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const token = accessTokenRef.current;
      if (!token) return;
      await markNotificationRead(token, notificationId);
      // The server broadcasts the authoritative count. This request is only a
      // safety net for clients that briefly reconnect while the event is sent.
      void refreshUnreadCount().catch(() => undefined);
    },
    [refreshUnreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    const token = accessTokenRef.current;
    if (!token) return;
    await markAllNotificationsRead(token);
    void refreshUnreadCount().catch(() => undefined);
  }, [refreshUnreadCount]);

  const openNotification = useCallback(
    async (notification: AppNotification) => {
      const type = notification.type;
        if (type.startsWith("CONTENT_REVIEW_")) {
          const targetType = dataValue(notification.data, "targetType");
          const targetId = dataValue(notification.data, "targetId");
          if (targetId && CONTENT_REVIEW_TYPES.some(value => value === targetType)) {
            navigate(`/${targetType}/${encodeURIComponent(targetId)}`);
          } else {
            navigate("/reviews/me");
          }
          return;
        }
      // Re-resolve stored/socket payloads so a renamed, hidden or deleted post
      // uses the current destination supplied by the notifications API.
      const isTradeDestination = type !== "TRADE_CONVERSATION_STARTED" && (
        type.startsWith("TRADE_POST_") || type.startsWith("TRADE_REVIEW_") ||
        ["APPROVED", "FEATURED", "UNHIDDEN", "REJECTED", "SAVED", "HIDDEN", "ARCHIVED", "DELETED"]
          .some((suffix) => isTradePostType(type, suffix)) ||
        Boolean(dataValue(notification.data, "tradePostId", "tradePostTarget"))
      );
      let refreshed = false;
      if (isTradeDestination) {
        const token = accessTokenRef.current;
        if (!token) throw new Error("Vui lòng đăng nhập lại để mở thông báo.");
        try {
          notification = await getNotification(token, notification.id);
          refreshed = true;
        } catch (error) {
          // Older API deployments may not expose notification detail yet.
          // Public destinations are verified against the post API below.
          if (error instanceof NotificationRequestError &&
            (error.status === 401 || error.status === 403)) throw error;
        }
        if (isNotificationTradePostUnavailable(notification)) {
          openSnackbar({ text: TRADE_POST_UNAVAILABLE_MESSAGE, type: "warning" });
          return;
        }
      }
      const postId = dataValue(
        notification.data,
        "tradePostId",
        "postId",
        "id"
      );
      let slug = dataValue(notification.data, "tradePostSlug", "slug");
      const target = dataValue(notification.data, "tradePostTarget");
      const opensPublicPost = target === "PUBLIC_DETAIL" || (!target && (
        type === "TRADE_POST_NEW" || isTradePostType(type, "APPROVED") ||
        isTradePostType(type, "FEATURED") || isTradePostType(type, "UNHIDDEN") ||
        type === "TRADE_REVIEW_APPROVED" || type === "TRADE_REVIEW_REPLIED"
      ));
      if (isTradeDestination && opensPublicPost && slug &&
        (!refreshed || notification.data?.tradePostAvailable !== true)) {
        try {
          const post = await getTradePostDetail(slug);
          // Never redirect an old slug to a different post that now uses it.
          if (!post.slug || (postId && post.id !== postId)) {
            openSnackbar({ text: TRADE_POST_UNAVAILABLE_MESSAGE, type: "warning" });
            return;
          }
          slug = post.slug;
          notification = {
            ...notification, data: { ...notification.data, tradePostAvailable: true },
          };
        } catch (error) {
          if (error instanceof TradePostRequestError && (error.status === 404 || error.status === 410)) {
            openSnackbar({ text: TRADE_POST_UNAVAILABLE_MESSAGE, type: "warning" });
            return;
          }
          throw error;
        }
      }
      const tradePath = slug && notification.data?.tradePostAvailable === true
        ? `/trade/${encodeURIComponent(slug)}` : "";
      const reviewId = dataValue(notification.data, "reviewId");
      const conversationId = dataValue(notification.data, "conversationId");
      const reason = dataValue(notification.data, "reason", "rejectionReason");

      if (type === "BUSINESS_APPLICATION_APPROVED") {
        await refreshUser();
        navigate("/trade/create");
        return;
      }
      if (type === "BUSINESS_APPLICATION_REJECTED") {
        navigate("/business/register", { state: { reason } });
        return;
      }
      if (isTradeDestination && target) {
        if (target === "PUBLIC_DETAIL" && tradePath) {
          navigate(tradePath, { state: { reviewId } satisfies NotificationRouteState });
        } else if (target === "OWNER_MANAGE" && postId) {
          // The edit screen fetches /me posts by ID and checks owner access.
          navigate(`/trade/manage/posts/${encodeURIComponent(postId)}/edit`, {
            state: { flashMessage: reason || notification.body },
          });
        } else {
          openSnackbar({
            text: target === "ADMIN_MANAGE"
              ? "Vui lòng mở thông báo này trên trang quản trị."
              : TRADE_POST_UNAVAILABLE_MESSAGE,
            type: "warning",
          });
        }
        return;
      }
      if (isTradeDestination && !tradePath && (
        type === "TRADE_POST_NEW" || isTradePostType(type, "APPROVED") ||
        isTradePostType(type, "FEATURED") || isTradePostType(type, "UNHIDDEN") ||
        type === "TRADE_REVIEW_APPROVED" || type === "TRADE_REVIEW_REPLIED"
      )) {
        openSnackbar({ text: TRADE_POST_UNAVAILABLE_MESSAGE, type: "warning" });
        return;
      }
      if (type === "TRADE_POST_NEW") {
        navigate(tradePath);
        return;
      }
      if (
        isTradePostType(type, "APPROVED") ||
        isTradePostType(type, "FEATURED") ||
        isTradePostType(type, "UNHIDDEN")
      ) {
        navigate(tradePath);
        return;
      }
      if (isTradePostType(type, "REJECTED")) {
        navigate(
          postId
            ? `/trade/manage/posts/${postId}/edit`
            : "/trade/manage",
          { state: { flashMessage: reason || notification.body } }
        );
        return;
      }
      if (isTradePostType(type, "SAVED")) {
        navigate("/trade/manage", {
          state: { initialTab: "overview" } satisfies NotificationRouteState,
        });
        return;
      }
      if (
        isTradePostType(type, "HIDDEN") ||
        isTradePostType(type, "ARCHIVED") ||
        isTradePostType(type, "DELETED")
      ) {
        navigate("/trade/manage", {
          state: { initialTab: "posts" } satisfies NotificationRouteState,
        });
        return;
      }
      if (type === "TRADE_REVIEW_RECEIVED") {
        navigate("/trade/manage", {
          state: {
            initialTab: "reviews",
            reviewId,
          } satisfies NotificationRouteState,
        });
        return;
      }
      if (type === "TRADE_REVIEW_APPROVED" || type === "TRADE_REVIEW_REPLIED") {
        navigate(tradePath, { state: { reviewId } satisfies NotificationRouteState });
        return;
      }
      if (type === "TRADE_CONVERSATION_STARTED" && conversationId) {
        navigate(`/trade/messages/${conversationId}`);
      }
    },
    [navigate, openSnackbar, refreshUser]
  );

  const readAndOpenNotification = useCallback(
    async (notification: AppNotification) => {
      if (!notification.readAt) {
        void markAsRead(notification.id).catch(() => undefined);
      }
      await openNotification(notification);
    },
    [markAsRead, openNotification]
  );

  const subscribeToChatMessages = useCallback((listener: ChatMessageListener) => {
    chatListenersRef.current.add(listener);
    return () => chatListenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      setUnreadCount(0);
      setLatestNotification(null);
      setAlertNotification(null);
      return;
    }

    void refreshUnreadCount().catch(() => undefined);
    const socket = createNotificationSocket(
      () => accessTokenRef.current,
      {
        onUnreadCount: setUnreadCount,
        onNewNotification: (payload) => {
          setUnreadCount(payload.unreadCount);
          setLatestNotification(payload.notification);
          setAlertNotification(payload.notification);
        },
        onChatMessage: (payload) => {
          chatListenersRef.current.forEach((listener) => listener(payload));
        },
        onUnauthorized: async () => {
          await refreshSession();
          await refreshUnreadCount().catch(() => undefined);
        },
      }
    );
    socket.connect();

    const reconnectWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshUnreadCount().catch(() => undefined);
        socket.connect();
      }
    };
    document.addEventListener("visibilitychange", reconnectWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", reconnectWhenVisible);
      socket.disconnect();
    };
  }, [
    accessToken,
    openNotification,
    readAndOpenNotification,
    refreshSession,
    refreshUnreadCount,
    status,
  ]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      unreadCount,
      latestNotification,
      refreshUnreadCount,
      markAsRead,
      markAllAsRead,
      openNotification,
      subscribeToChatMessages,
    }),
    [
      unreadCount,
      latestNotification,
      refreshUnreadCount,
      markAsRead,
      markAllAsRead,
      openNotification,
      subscribeToChatMessages,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationAlert
        notification={alertNotification}
        onDismiss={() => setAlertNotification(null)}
        onOpen={() => {
          if (!alertNotification) return;
          const notification = alertNotification;
          setAlertNotification(null);
          void readAndOpenNotification(notification).catch((error: unknown) => {
            openSnackbar({
              text: error instanceof Error ? error.message : "Không thể mở thông báo.",
              type: "error",
            });
          });
        }}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (!value) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return value;
}
