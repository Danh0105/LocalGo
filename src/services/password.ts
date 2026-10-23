import { apiRequest } from "@/lib/http-client";
import type { CurrentUser } from "@/services/auth";

export const isGardenAccount = (user: CurrentUser | null) => user?.role === "BUSINESS" && user.businessType === "GARDEN";
export const FORGOT_PASSWORD_MESSAGE = "Nếu email tồn tại và đủ điều kiện, hướng dẫn đặt lại mật khẩu đã được gửi.";
export interface NewPasswordFields { newPassword: string; newPasswordConfirmation: string }
export interface ChangePasswordFields extends NewPasswordFields { currentPassword: string }
export type PasswordErrors = Partial<Record<keyof ChangePasswordFields | "email", string>>;
export function validatePassword(fields: NewPasswordFields & { currentPassword?: string }): PasswordErrors {
  const errors: PasswordErrors = {};
  if ("currentPassword" in fields && !fields.currentPassword) errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
  if (fields.newPassword.length < 8 || fields.newPassword.length > 128) errors.newPassword = "Mật khẩu mới phải dài 8–128 ký tự.";
  else if (!/[\p{L}]/u.test(fields.newPassword) || !/[0-9]/.test(fields.newPassword)) errors.newPassword = "Mật khẩu mới cần có ít nhất một chữ cái và một chữ số.";
  if (!fields.newPasswordConfirmation) errors.newPasswordConfirmation = "Vui lòng xác nhận mật khẩu mới.";
  else if (fields.newPassword !== fields.newPasswordConfirmation) errors.newPasswordConfirmation = "Xác nhận mật khẩu mới không trùng khớp.";
  return errors;
}
const json = (body: object) => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" as const });
export function changePassword(accessToken: string, fields: ChangePasswordFields) {
  return apiRequest<void>("/users/me/password", { ...json({ currentPassword: fields.currentPassword, newPassword: fields.newPassword, newPasswordConfirmation: fields.newPasswordConfirmation }), method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` } });
}
export function forgotPassword(email: string) {
  return apiRequest<{ message: string }>("/auth/forgot-password", { ...json({ email }), method: "POST" });
}
export function resetPassword(token: string, fields: NewPasswordFields) {
  return apiRequest<void>("/auth/reset-password", { ...json({ token, newPassword: fields.newPassword, newPasswordConfirmation: fields.newPasswordConfirmation }), method: "POST" });
}
