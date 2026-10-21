import { Icon } from "zmp-ui";

import type { AppNotification } from "@/services/notifications";
import {
  isNotificationTradePostUnavailable,
  TRADE_POST_UNAVAILABLE_MESSAGE,
} from "@/services/notifications";
import "@/css/components/notification-alert.css";

interface NotificationAlertProps {
  notification: AppNotification | null;
  onOpen: () => void;
  onDismiss: () => void;
}

export default function NotificationAlert({
  notification,
  onOpen,
  onDismiss,
}: NotificationAlertProps) {
  if (!notification) return null;

  return (
    <aside className="notification-alert" aria-live="polite" role="status">
      <div className="notification-alert__surface">
        <button
          className="notification-alert__content"
          type="button"
          onClick={onOpen}
        >
          <span className="notification-alert__icon" aria-hidden="true">
            <Icon icon="zi-notif" />
          </span>
          <span className="notification-alert__copy">
            <small>THÔNG BÁO MỚI</small>
            <strong>{notification.title || "Bạn có thông báo mới"}</strong>
            {notification.body && <span>{notification.body}</span>}
            {isNotificationTradePostUnavailable(notification) && (
              <span>{TRADE_POST_UNAVAILABLE_MESSAGE}</span>
            )}
          </span>
          <span className="notification-alert__open" aria-hidden="true">
            <Icon icon="zi-arrow-right" />
          </span>
        </button>
        <button
          className="notification-alert__close"
          type="button"
          aria-label="Đóng thông báo"
          onClick={onDismiss}
        >
          <Icon icon="zi-close" />
        </button>
      </div>
    </aside>
  );
}
