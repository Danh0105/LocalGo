const sensitiveKeys = new Set(["password", "currentPassword", "newPassword", "newPasswordConfirmation", "token", "refreshToken", "accessToken", "passwordHash", "authorization"] .map((key) => key.toLowerCase()));
/** Auth request bodies must never be logged. Use this for any structured diagnostic data. */
export function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveData);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKeys.has(key.toLowerCase()) ? "[REDACTED]" : redactSensitiveData(item)]));
  return value;
}
