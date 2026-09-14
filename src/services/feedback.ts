import feedbackIcon from "@/static/customer-service.png";
import {
  FeedbackCategory,
  FeedbackChannel,
} from "@/data/feedback";

export interface FeedbackQuery {
  category?: FeedbackCategory;
}

export interface FeedbackPayload {
  channelId?: string;
  fullName: string;
  phone: string;
  content: string;
  mediaIds?: string[];
}

export interface UploadedFeedbackAttachment {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
}

export interface FeedbackLookupQuery {
  ticketCode: string;
  phone: string;
}

export type FeedbackTicketStatus =
  | "new"
  | "in_progress"
  | "resolved"
  | "closed";

export interface FeedbackTicketLookupChannel {
  id: string;
  title: string;
  category: FeedbackCategory;
}

export interface FeedbackTicketLookup {
  ticketCode: string;
  status: FeedbackTicketStatus;
  channel: FeedbackTicketLookupChannel | null;
  content: string;
  attachments?: UploadedFeedbackAttachment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface FeedbackChannelApiItem {
  id: string;
  title: string;
  category: FeedbackCategory;
  responseTime: string;
  requiredInfo: string[];
  summary: string;
  description: string[];
  examples: string[];
  note: string;
  imageUrl: string | null;
  imageAlt: string;
  sortOrder: number;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

export class FeedbackSubmitError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "FeedbackSubmitError";
    this.status = status;
    this.code = code;
  }
}

export class FeedbackAttachmentUploadError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "FeedbackAttachmentUploadError";
    this.status = status;
    this.code = code;
  }
}

export class FeedbackLookupError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "FeedbackLookupError";
    this.status = status;
    this.code = code;
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.localgo.skilltripx.com.vn/api/v1";

export function uploadFeedbackAttachment(
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal
): Promise<UploadedFeedbackAttachment> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("files", file, file.name);

    const onAbort = () => request.abort();
    const finish = () => signal?.removeEventListener("abort", onAbort);

    request.open("POST", `${API_BASE_URL}/feedback/tickets/attachments`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      finish();
      let body: unknown;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        reject(new FeedbackAttachmentUploadError("Phản hồi tải tệp không hợp lệ.", request.status));
        return;
      }

      if (request.status < 200 || request.status >= 300) {
        const error =
          body && typeof body === "object" && "error" in body
            ? (body as ApiErrorEnvelope).error
            : undefined;
        reject(
          new FeedbackAttachmentUploadError(
            error?.message || "Không thể tải tệp lên. Vui lòng thử lại.",
            request.status,
            error?.code
          )
        );
        return;
      }

      const files =
        body && typeof body === "object" && "data" in body
          ? (body as ApiEnvelope<unknown>).data
          : body;
      const attachment = Array.isArray(files) ? files[0] : undefined;
      if (!attachment || typeof attachment.id !== "string" || !attachment.id) {
        reject(new FeedbackAttachmentUploadError("Máy chủ không trả về mã tệp đính kèm.", request.status));
        return;
      }
      resolve(attachment as UploadedFeedbackAttachment);
    };
    request.onerror = () => {
      finish();
      reject(new FeedbackAttachmentUploadError("Không thể kết nối tới máy chủ để tải tệp.", 0));
    };
    request.onabort = () => {
      finish();
      reject(new FeedbackAttachmentUploadError("Đã hủy tải tệp.", 0));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      finish();
      reject(new FeedbackAttachmentUploadError("Đã hủy tải tệp.", 0));
    } else {
      try {
        request.send(formData);
      } catch {
        finish();
        reject(new FeedbackAttachmentUploadError("Không thể bắt đầu tải tệp lên.", 0));
      }
    }
  });
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED");
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}

function toFeedbackChannel(item: FeedbackChannelApiItem): FeedbackChannel {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    responseTime: item.responseTime,
    requiredInfo: item.requiredInfo,
    summary: item.summary,
    description: item.description,
    examples: item.examples,
    note: item.note,
    image: item.imageUrl ?? feedbackIcon,
    imageAlt: item.imageAlt || item.title,
    sortOrder: item.sortOrder,
  };
}

export async function getFeedbackChannels(
  query: FeedbackQuery = {}
): Promise<FeedbackChannel[]> {
  const { category } = query;
  const search = category ? `?category=${encodeURIComponent(category)}` : "";
  const items = await get<FeedbackChannelApiItem[]>(
    `/feedback/channels${search}`
  );
  return items.map(toFeedbackChannel).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getFeedbackChannelById(
  id: string,
  signal?: AbortSignal
): Promise<FeedbackChannel | undefined> {
  try {
    const item = await get<FeedbackChannelApiItem>(
      `/feedback/channels/${encodeURIComponent(id)}`,
      signal
    );
    return toFeedbackChannel(item);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return undefined;
    }
    throw error;
  }
}

export async function submitFeedback(
  payload: FeedbackPayload,
  accessToken: string
): Promise<{ success: true; ticketCode: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/feedback/tickets/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new FeedbackSubmitError("Không thể kết nối tới máy chủ.", 0);
  }
  const body = (await response.json()) as
    | ApiEnvelope<{ success: true; ticketCode: string }>
    | ApiErrorEnvelope;
  if (!response.ok || !body.success) {
    throw new FeedbackSubmitError(
      !body.success ? body.error.message : "Không thể gửi phản hồi.",
      response.status,
      !body.success ? body.error.code : undefined
    );
  }
  return body.data;
}

export async function lookupFeedbackTicket(
  query: FeedbackLookupQuery
): Promise<FeedbackTicketLookup> {
  const search = new URLSearchParams({
    ticketCode: query.ticketCode,
    phone: query.phone,
  });
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/feedback/tickets/lookup?${search.toString()}`
    );
  } catch {
    throw new FeedbackLookupError("Không thể kết nối tới máy chủ.", 0);
  }
  const body = (await response.json()) as
    | ApiEnvelope<FeedbackTicketLookup>
    | ApiErrorEnvelope;
  if (!response.ok || !body.success) {
    throw new FeedbackLookupError(
      !body.success ? body.error.message : "Không thể tra cứu phản hồi.",
      response.status,
      !body.success ? body.error.code : undefined
    );
  }
  return body.data;
}

export async function getMyFeedbackTickets(
  accessToken: string,
  signal?: AbortSignal
): Promise<FeedbackTicketLookup[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/feedback/tickets/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
  } catch {
    throw new FeedbackLookupError("Không thể kết nối tới máy chủ.", 0);
  }
  const body = (await response.json()) as
    | ApiEnvelope<FeedbackTicketLookup[]>
    | ApiErrorEnvelope;
  if (!response.ok || !body.success) {
    if (response.status === 404) {
      throw new FeedbackLookupError(
        "Hiện chưa thể tải lịch sử phản hồi. Bạn vẫn có thể tra cứu bằng mã phản hồi và số điện thoại ở trên.",
        404,
        "MY_FEEDBACK_UNAVAILABLE"
      );
    }
    throw new FeedbackLookupError(
      !body.success
        ? body.error.message
        : "Không thể tải danh sách phản hồi.",
      response.status,
      !body.success ? body.error.code : undefined
    );
  }
  return body.data;
}
