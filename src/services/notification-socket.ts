import { io, Socket } from "socket.io-client";

import type { AppNotification } from "@/services/notifications";
import type { TradeMessageResponse } from "@/services/trade-posts";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "https://api.localgo.skilltripx.com.vn/api/v1";
const SOCKET_URL =
  import.meta.env.VITE_NOTIFICATIONS_SOCKET_URL ??
  `${new URL(API_BASE_URL).origin}/notifications`;

export interface ChatMessageEvent {
  conversationId: string;
  message: TradeMessageResponse;
}

interface NotificationSocketHandlers {
  onUnreadCount: (unreadCount: number) => void;
  onNewNotification: (payload: {
    notification: AppNotification;
    unreadCount: number;
  }) => void;
  onChatMessage: (payload: ChatMessageEvent) => void;
  onUnauthorized: () => Promise<void>;
}

function isUnauthorized(error: Error & { data?: { code?: string } }): boolean {
  return (
    error.message === "UNAUTHORIZED" || error.data?.code === "UNAUTHORIZED"
  );
}

export function createNotificationSocket(
  getAccessToken: () => string | null,
  handlers: NotificationSocketHandlers
): { connect: () => void; disconnect: () => void } {
  let refreshing = false;
  const socket: Socket = io(SOCKET_URL, {
    path: "/socket.io",
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 2000,
    auth: (callback) => callback({ token: getAccessToken() ?? "" }),
  });

  socket.on("notification.unread_count", ({ unreadCount }: { unreadCount: number }) => {
    handlers.onUnreadCount(unreadCount);
  });
  socket.on(
    "notification.new",
    (payload: { notification: AppNotification; unreadCount: number }) => {
      handlers.onNewNotification(payload);
    }
  );
  socket.on("chat.message", (payload: ChatMessageEvent) => {
    handlers.onChatMessage(payload);
  });
  socket.on("connect_error", (error: Error & { data?: { code?: string } }) => {
    if (!isUnauthorized(error) || refreshing) return;
    refreshing = true;
    socket.disconnect();
    void handlers
      .onUnauthorized()
      .then(() => {
        refreshing = false;
        if (getAccessToken()) socket.connect();
      })
      .catch(() => {
        refreshing = false;
      });
  });

  return {
    connect: () => {
      if (getAccessToken() && !socket.connected) socket.connect();
    },
    disconnect: () => socket.disconnect(),
  };
}
