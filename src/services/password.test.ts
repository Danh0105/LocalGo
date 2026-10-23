import { afterEach, describe, expect, it, vi } from "vitest";
import { changePassword, forgotPassword, resetPassword, validatePassword, isGardenAccount } from "./password";
import { ApiRequestError, apiRequest, setApiAuthHandler } from "@/lib/http-client";
import { redactSensitiveData } from "@/lib/sensitive-data";
import type { CurrentUser } from "./auth";

afterEach(() => { vi.unstubAllGlobals(); setApiAuthHandler(null); });
const fields = { currentPassword: "OldSecret123", newPassword: "NewSecret456", newPasswordConfirmation: "NewSecret456" };
const response = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, data }), { status, headers: { "Content-Type": "application/json" } });
describe("password contract", () => {
  it.each(["", "abc1234", "a1".repeat(65), "abcdefgh", "12345678"])("rejects invalid new password %s", (value) => {
    expect(validatePassword({ newPassword: value, newPasswordConfirmation: value }).newPassword).toBeTruthy();
  });
  it("accepts letters and digits without requiring uppercase or special characters", () => {
    expect(validatePassword({ newPassword: "mậtkhẩu123", newPasswordConfirmation: "mậtkhẩu123" })).toEqual({});
    expect(validatePassword({ ...fields, currentPassword: "", newPasswordConfirmation: "different" })).toHaveProperty("currentPassword");
    expect(validatePassword({ ...fields, newPasswordConfirmation: "different" })).toHaveProperty("newPasswordConfirmation");
  });
  it.each(["USER", "MODERATOR", "ADMIN", "BUSINESS"])("requires both exact role and garden type: %s", (role) => {
    expect(isGardenAccount({ role, businessType: "GARDEN" } as CurrentUser)).toBe(role === "BUSINESS");
    expect(isGardenAccount({ role, businessType: "HOTEL" } as CurrentUser)).toBe(false);
    expect(isGardenAccount(null)).toBe(false);
  });
  it("handles 204 without JSON parsing and never refreshes change/reset requests", async () => {
    const json = vi.fn().mockRejectedValue(new Error("No JSON"));
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, json });
    vi.stubGlobal("fetch", fetch);
    await changePassword("access", fields);
    await resetPassword("opaque", fields);
    expect(json).not.toHaveBeenCalled();
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: "PATCH", headers: { Authorization: "Bearer access" } });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ token: "opaque", newPassword: fields.newPassword, newPasswordConfirmation: fields.newPasswordConfirmation });
    expect(fetch.mock.calls[1][1].headers).not.toHaveProperty("Authorization");
  });
  it("accepts 202 and sends forgot password publicly", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ message: "generic" }, 202));
    vi.stubGlobal("fetch", fetch);
    expect(await forgotPassword("garden@example.com")).toEqual({ message: "generic" });
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });
  it("does not refresh, retry, or log invalid current password or 429", async () => {
    const refresh = vi.fn();
    setApiAuthHandler({ refresh, expire: vi.fn(), authorize: (token) => token });
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: "CURRENT_PASSWORD_INVALID", message: "Sai mật khẩu" } }), { status: 401, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(changePassword("access", fields)).rejects.toMatchObject({ code: "CURRENT_PASSWORD_INVALID", authHandled: true });
    fetch.mockResolvedValue(new Response(null, { status: 429 }));
    await expect(resetPassword("opaque", fields)).rejects.toBeInstanceOf(ApiRequestError);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("retries an authenticated request at most once using rotated access token", async () => {
    const refresh = vi.fn().mockResolvedValue({ accessToken: "new-access" });
    const expire = vi.fn();
    setApiAuthHandler({ refresh, expire, authorize: (token) => token });
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(response({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    expect(await apiRequest("/private", { headers: { Authorization: "Bearer old-access" } })).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer new-access");
    expect(expire).not.toHaveBeenCalled();
  });
  it("redacts every sensitive field recursively", () => {
    const sensitive = { password: "a", currentPassword: "b", newPassword: "c", newPasswordConfirmation: "d", token: "e", refreshToken: "f", accessToken: "g", Authorization: "h" };
    expect(redactSensitiveData({ nested: [sensitive], public: "safe" })).toEqual({ nested: [Object.fromEntries(Object.keys(sensitive).map((key) => [key, "[REDACTED]"]))], public: "safe" });
  });
  it("rejects a late private response after logout before it can refill a cache", async () => {
    let generation = 0;
    let complete!: (response: Response) => void;
    setApiAuthHandler({ refresh: vi.fn(), expire: vi.fn(), authorize: (token) => token, generation: () => generation });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise((resolve) => { complete = resolve; })));
    const request = apiRequest("/private", { headers: { Authorization: "Bearer old" } });
    generation++;
    complete(response({ private: true }));
    await expect(request).rejects.toMatchObject({ code: "SESSION_ENDED", authHandled: true });
  });
});
