import { API_CONFIG, getApiBaseUrl } from "@/config/api";
import type {
  ApiError,
  ApiResponse,
  ApiSuccess,
  PaginationMeta,
} from "@/types/api";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status ?? 0;
    this.code = options.code ?? "REQUEST_FAILED";
    this.details = options.details ?? null;
  }
}

type ApiRequestOptions = Omit<RequestInit, "signal"> & {
  signal?: AbortSignal;
  timeoutMs?: number;
};

function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ApiError>;
  return (
    candidate.success === false &&
    !!candidate.error &&
    typeof candidate.error.code === "string" &&
    typeof candidate.error.message === "string"
  );
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestEnvelope<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiSuccess<T> & { meta?: PaginationMeta }> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? API_CONFIG.requestTimeoutMs;
  let didTimeout = false;

  const handleExternalAbort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", handleExternalAbort, {
    once: true,
  });

  const timeoutId = window.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  const { timeoutMs: _timeoutMs, signal: _signal, ...requestInit } = options;
  void _timeoutMs;
  void _signal;

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      headers: {
        Accept: "application/json",
        ...requestInit.headers,
      },
      signal: controller.signal,
    });

    if (response.status === 204) return { success: true, data: undefined as T };

    const body = await readJson(response);
    if (!response.ok || isApiError(body)) {
      const apiError = isApiError(body) ? body.error : null;
      const isRateLimited = response.status === 429;
      throw new ApiRequestError(
        isRateLimited
          ? "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau."
          : apiError?.message || "Không thể hoàn tất yêu cầu.",
        {
          status: response.status,
          code: apiError?.code,
          details: apiError?.details,
        },
      );
    }

    const envelope = body as ApiResponse<T> | null;
    if (!envelope || envelope.success !== true || !("data" in envelope)) {
      throw new ApiRequestError("Dữ liệu phản hồi từ máy chủ không hợp lệ.", {
        status: response.status,
        code: "INVALID_RESPONSE",
      });
    }

    return envelope;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    if (controller.signal.aborted) {
      if (options.signal?.aborted) {
        throw new DOMException("Đã hủy yêu cầu.", "AbortError");
      }
      if (didTimeout) {
        throw new ApiRequestError(
          "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.",
          { status: 408, code: "CLIENT_TIMEOUT" },
        );
      }
    }

    throw new ApiRequestError(
      "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      { code: "NETWORK_ERROR", details: error },
    );
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", handleExternalAbort);
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  return (await requestEnvelope<T>(path, options)).data;
}

export async function apiPaginatedRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{ items: T[]; meta: PaginationMeta }> {
  const response = await requestEnvelope<T[]>(path, options);
  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiRequestError("Dữ liệu phân trang từ máy chủ không hợp lệ.", {
      code: "INVALID_RESPONSE",
    });
  }
  return { items: response.data, meta: response.meta };
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Đã xảy ra lỗi. Vui lòng thử lại.";
}
