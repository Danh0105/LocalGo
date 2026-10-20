import { configureResidentFeedbackChat, type ResidentChatMessage } from './feedback-conversation';

/**
 * IMPORTANT: Verify these RESIDENT routes against the actual NestJS controller.
 * The admin endpoints are /admin/feedback/tickets/:id/messages etc., but resident routes
 * were not included in the supplied source. Never send admin credentials from Mini App.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.localgo.skilltripx.com.vn/api/v1').replace(/\/$/, '');
const messagePath = (id: string) => `/feedback/tickets/${encodeURIComponent(id)}/messages`;
const readPath = (id: string) => `/feedback/tickets/${encodeURIComponent(id)}/realtime/read`;

async function request<T>(method: 'GET' | 'POST', path: string, token: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const data = payload as { message?: string | string[] } | null;
    const detail = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new Error(detail || `Không thể kết nối hội thoại (HTTP ${response.status}). Kiểm tra route API phía người dân.`);
  }
  const envelope = payload as { data?: T } | null;
  return (envelope?.data ?? payload) as T;
}

configureResidentFeedbackChat({
  list: async (id, token, signal) => {
    const result = await request<ResidentChatMessage[] | { items?: ResidentChatMessage[]; messages?: ResidentChatMessage[] }>('GET', messagePath(id), token, undefined, signal);
    const messages = Array.isArray(result) ? result : result?.messages ?? result?.items;
    if (!Array.isArray(messages)) throw new Error('API trả về danh sách tin nhắn không đúng định dạng.');
    return messages;
  },
  send: (id, token, body) => request<ResidentChatMessage>('POST', messagePath(id), token, body),
  markRead: (id, token) => request<void>('POST', readPath(id), token),
});
