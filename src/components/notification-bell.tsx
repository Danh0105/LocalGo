import { Icon, useNavigate } from "zmp-ui";

import { useCurrentUser } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notification-context";
import "@/css/components/notification-bell.css";

interface NotificationBellProps {
  className?: string;
  alwaysVisible?: boolean;
  prominent?: boolean;
}

function badgeLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export default function NotificationBell({
  className = "",
  alwaysVisible = false,
  prominent = false,
}: NotificationBellProps) {
  const navigate = useNavigate();
  const { status } = useCurrentUser();
  const { unreadCount } = useNotifications();

  if (status !== "authenticated" && !alwaysVisible) return null;

  return (
    <button
      className={`notification-bell ${prominent ? "notification-bell--prominent" : ""} ${className}`.trim()}
      type="button"
      aria-label={
        unreadCount > 0
          ? `Thông báo, ${badgeLabel(unreadCount)} chưa đọc`
          : status === "authenticated"
            ? "Thông báo"
            : "Thông báo, đăng nhập Zalo để xem"
      }
      onClick={() => navigate("/notifications")}
    >
      <Icon icon="zi-notif" />
      {unreadCount > 0 && (
        <span aria-hidden="true">{badgeLabel(unreadCount)}</span>
      )}
    </button>
  );
}
