const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "https://api.localgo.skilltripx.com.vn/api/v1";

export type NotificationData = Record<string, unknown>;

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: NotificationData | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: NotificationMeta;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

export class NotificationRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "NotificationRequestError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });
  } catch {
    throw new NotificationRequestError(
      "Không thể kết nối tới máy chủ thông báo.",
      0
    );
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => undefined)) as
    | ApiEnvelope<T>
    | ApiErrorEnvelope
    | undefined;
  if (!response.ok || !body?.success) {
    throw new NotificationRequestError(
      body && !body.success
        ? body.error.message
        : "Không thể xử lý thông báo.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }
  return body.data;
}

export function getUnreadNotificationCount(accessToken: string): Promise<number> {
  return request<{ unreadCount: number }>(
    "/notifications/unread-count",
    accessToken,
    { method: "GET" }
  ).then((result) => result.unreadCount);
}

export async function getNotifications(
  accessToken: string,
  options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
): Promise<{ items: AppNotification[]; meta: NotificationMeta }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (options.unreadOnly) params.set("unreadOnly", "true");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new NotificationRequestError(
      "Không thể kết nối tới máy chủ thông báo.",
      0
    );
  }

  const body = (await response.json().catch(() => undefined)) as
    | ApiEnvelope<AppNotification[]>
    | ApiErrorEnvelope
    | undefined;
  if (!response.ok || !body?.success) {
    throw new NotificationRequestError(
      body && !body.success
        ? body.error.message
        : "Không thể tải thông báo.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }

  return {
    items: body.data,
    meta: body.meta ?? {
      page,
      limit,
      total: body.data.length,
      totalPages: body.data.length < limit ? page : page + 1,
    },
  };
}

export function markNotificationRead(
  accessToken: string,
  notificationId: string
): Promise<void> {
  return request<void>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    accessToken,
    { method: "PATCH" }
  );
}

export function markAllNotificationsRead(accessToken: string): Promise<void> {
  return request<void>("/notifications/read-all", accessToken, {
    method: "PATCH",
  });
}
