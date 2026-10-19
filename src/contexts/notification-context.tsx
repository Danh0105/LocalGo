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
import { useNavigate } from "zmp-ui";

import NotificationAlert from "@/components/notification-alert";
import { useCurrentUser } from "@/contexts/auth-context";
import {
  ChatMessageEvent,
  createNotificationSocket,
} from "@/services/notification-socket";
import {
  AppNotification,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";

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
      const postId = dataValue(
        notification.data,
        "tradePostId",
        "postId",
        "id"
      );
      const slug = dataValue(notification.data, "slug", "tradePostSlug");
      const tradePath = postId || slug ? `/trade/${slug || postId}` : "/trade";
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
    [navigate, refreshUser]
  );

  const readAndOpenNotification = useCallback(
    async (notification: AppNotification) => {
      if (!notification.readAt) {
        await markAsRead(notification.id).catch(() => undefined);
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
          void readAndOpenNotification(notification);
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
