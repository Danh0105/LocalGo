const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_CONFIG = {
  chatbotTimeoutMs: 60_000,
  requestTimeoutMs: 30_000,
} as const;

export function getApiBaseUrl(): string {
  if (!configuredApiBaseUrl) {
    throw new Error(
      "Chưa cấu hình VITE_API_BASE_URL. Vui lòng kiểm tra tệp .env.",
    );
  }

  return configuredApiBaseUrl.replace(/\/+$/, "");
}
