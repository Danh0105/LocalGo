export type UserRole = "USER" | "BUSINESS" | "MODERATOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "BLOCKED" | "PENDING";

export interface CurrentUser {
  id: string;
  zaloId: string | null;
  phone: string | null;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  businessType: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

export class AuthRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AuthRequestError";
    this.status = status;
    this.code = code;
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.localgo.skilltripx.com.vn/api/v1";

async function request<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new AuthRequestError("Không thể kết nối tới máy chủ.", 0);
  }

  if (response.status === 204) return undefined as T;

  let body: ApiEnvelope<T> | ApiErrorEnvelope | undefined;
  try {
    body = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
  } catch {
    body = undefined;
  }

  if (!response.ok || !body?.success) {
    throw new AuthRequestError(
      body && !body.success ? body.error.message : fallbackMessage,
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }

  return body.data;
}

export function loginWithZalo(accessToken: string): Promise<AuthTokens> {
  return request<AuthTokens>(
    "/auth/zalo",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    },
    "Không thể đăng nhập bằng Zalo."
  );
}

export function loginWithEmail(email: string, password: string): Promise<AuthTokens> {
  return request<AuthTokens>("/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }, "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.");
}

export function refreshAuthToken(refreshToken: string): Promise<AuthTokens> {
  return request<AuthTokens>(
    "/auth/refresh",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    },
    "Phiên đăng nhập đã hết hạn."
  );
}

export function getCurrentUser(
  accessToken: string,
  signal?: AbortSignal
): Promise<CurrentUser> {
  return request<CurrentUser>(
    "/users/me",
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
    "Không thể tải thông tin tài khoản."
  );
}
