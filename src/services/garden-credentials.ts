import { ApiRequestError, apiRequest } from "@/lib/http-client";

// Private responses are intentionally separate from BusinessProfile and its caches.
export interface GardenCredentialsStatus {
  email: string;
  passwordConfigured: boolean;
  initialPasswordAcknowledged: boolean;
  canIssueInitialPassword: boolean;
}
export interface InitialGardenPassword { password: string; requiresAcknowledgement: true }
export const initialGardenPasswordEnabled = () => import.meta.env.VITE_GARDEN_INITIAL_PASSWORD_ENABLED === "true";
const credentialsPath = "/business-profiles/me/credentials";
const privateRequest = (accessToken: string) => ({ headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" as const });
export async function getGardenCredentials(accessToken: string): Promise<GardenCredentialsStatus> {
  const value = await apiRequest<GardenCredentialsStatus>(credentialsPath, privateRequest(accessToken));
  if (!value || typeof value.email !== "string" || typeof value.passwordConfigured !== "boolean" || typeof value.initialPasswordAcknowledged !== "boolean" || typeof value.canIssueInitialPassword !== "boolean" || (value.initialPasswordAcknowledged && value.canIssueInitialPassword)) {
    throw new ApiRequestError("Thông tin đăng nhập chưa sẵn sàng.", { code: "INVALID_RESPONSE" });
  }
  return { email: value.email, passwordConfigured: value.passwordConfigured, initialPasswordAcknowledged: value.initialPasswordAcknowledged, canIssueInitialPassword: value.canIssueInitialPassword };
}
export async function issueInitialGardenPassword(accessToken: string): Promise<InitialGardenPassword> {
  if (!initialGardenPasswordEnabled()) throw new ApiRequestError("Tính năng cấp mật khẩu ban đầu chưa sẵn sàng.", { code: "FEATURE_UNAVAILABLE" });
  const value = await apiRequest<InitialGardenPassword>(`${credentialsPath}/initial-password`, { ...privateRequest(accessToken), method: "POST", requirePrivateNoStore: true });
  if (!value || typeof value.password !== "string" || value.password.length < 12 || !/[a-zA-Z]/.test(value.password) || !/[0-9]/.test(value.password) || value.requiresAcknowledgement !== true) throw new ApiRequestError("Không thể nhận mật khẩu ban đầu. Vui lòng thử lại.", { code: "INVALID_RESPONSE" });
  return { password: value.password, requiresAcknowledgement: true };
}
export function acknowledgeInitialGardenPassword(accessToken: string) {
  return apiRequest<void>(`${credentialsPath}/initial-password/acknowledge`, { ...privateRequest(accessToken), method: "POST" });
}
