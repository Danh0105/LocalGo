import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useAuthenticatedRequest } from "@/hooks/use-authenticated-request";
import { getMyBusinessProfile } from "@/services/business-profiles";
import { AuthRequestError } from "@/services/auth";
import { apiRequest } from "@/lib/http-client";
import { changePassword } from "@/services/password";
import { businessProfileKeys, readBusinessProfileCache, writeBusinessProfileCache } from "@/lib/business-profile-cache";

import { AuthProvider, useCurrentUser } from "./auth-context";

const {
  authorizeMock,
  getZaloAccessTokenMock,
  getCurrentUserMock,
  loginWithZaloMock,
  refreshAuthTokenMock,
} = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
  getZaloAccessTokenMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  loginWithZaloMock: vi.fn(),
  refreshAuthTokenMock: vi.fn(),
}));

vi.mock("zmp-sdk", () => ({
  authorize: authorizeMock,
  getAccessToken: getZaloAccessTokenMock,
}));

vi.mock("@/services/auth", async () => {
  const actual = await vi.importActual<typeof import("@/services/auth")>(
    "@/services/auth"
  );
  return {
    ...actual,
    getCurrentUser: getCurrentUserMock,
    loginWithZalo: loginWithZaloMock,
    refreshAuthToken: refreshAuthTokenMock,
  };
});

const profile = {
  id: "localgo-user-1",
  zaloId: "zalo-user-1",
  phone: null,
  email: null,
  displayName: "Nguyễn Văn A",
  avatarUrl: null,
  role: "USER" as const,
  status: "ACTIVE" as const,
  businessType: null,
  lastLoginAt: null,
  createdAt: "2026-10-20T00:00:00.000Z",
  updatedAt: "2026-10-20T00:00:00.000Z",
};

function AuthProbe({ requestPermission }: { requestPermission?: boolean }) {
  const { authenticate, status, error, logout } = useCurrentUser();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          void authenticate(
            requestPermission === undefined
              ? undefined
              : { requestUserInfoPermission: requestPermission }
          ).catch(() => undefined)
        }
      >
        Đăng nhập
      </button>
      <output>{status}</output>
      <button type="button" onClick={logout}>Logout</button>
      <p>{error}</p>
    </>
  );
}

function AuthenticatedProfileProbe() {
  const request = useAuthenticatedRequest();
  const [message, setMessage] = useState("");
  return <><button type="button" onClick={() => void request((token) => getMyBusinessProfile(token, "localgo-user-1")).then((result) => setMessage(result.businessName)).catch(() => setMessage("Tải hồ sơ thất bại"))}>Tải hồ sơ</button><p>{message}</p></>;
}

let session: ReturnType<typeof useCurrentUser>;
function SessionProbe() {
  session = useCurrentUser();
  return <output>{session.status}</output>;
}

describe("AuthProvider Zalo login", () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.clearAllMocks();
    authorizeMock.mockResolvedValue({ "scope.userInfo": true });
    getZaloAccessTokenMock.mockResolvedValue("zalo-access-token");
    loginWithZaloMock.mockResolvedValue({
      accessToken: "localgo-access-token",
      refreshToken: "localgo-refresh-token",
      expiresAt: "2026-11-20T00:00:00.000Z",
    });
    getCurrentUserMock.mockResolvedValue(profile);
    refreshAuthTokenMock.mockRejectedValue(new Error("unused"));
  });

  it("requests scope.userInfo before obtaining the Zalo access token by default", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(screen.getByText("authenticated")).toBeInTheDocument());
    expect(authorizeMock).toHaveBeenCalledWith({ scopes: ["scope.userInfo"] });
    expect(getZaloAccessTokenMock).toHaveBeenCalledOnce();
    expect(authorizeMock.mock.invocationCallOrder[0]).toBeLessThan(
      getZaloAccessTokenMock.mock.invocationCallOrder[0]
    );
    expect(loginWithZaloMock).toHaveBeenCalledWith("zalo-access-token");
    expect(window.localStorage.getItem("localgo.auth.access-token")).toBe("localgo-access-token");
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBe("localgo-refresh-token");
  });

  it("restores login after closing and reopening the app without Zalo authorization", async () => {
    const first = render(<AuthProvider><AuthProbe /></AuthProvider>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Đăng nhập" }));
    await screen.findByText("authenticated");
    first.unmount();
    window.sessionStorage.clear();
    vi.clearAllMocks();

    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await screen.findByText("authenticated");
    expect(getCurrentUserMock).toHaveBeenCalledWith("localgo-access-token");
    expect(authorizeMock).not.toHaveBeenCalled();
    expect(getZaloAccessTokenMock).not.toHaveBeenCalled();
    expect(loginWithZaloMock).not.toHaveBeenCalled();
  });

  it("silently refreshes an expired saved access token and persists rotated tokens", async () => {
    window.localStorage.setItem("localgo.auth.access-token", "expired");
    window.localStorage.setItem("localgo.auth.refresh-token", "saved-refresh");
    getCurrentUserMock.mockRejectedValueOnce(new AuthRequestError("Expired", 401));
    refreshAuthTokenMock.mockResolvedValue({ accessToken: "renewed", refreshToken: "rotated" });
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await screen.findByText("authenticated");
    expect(refreshAuthTokenMock).toHaveBeenCalledWith("saved-refresh");
    expect(window.localStorage.getItem("localgo.auth.access-token")).toBe("renewed");
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBe("rotated");
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it("restores a session when only a refresh token remains", async () => {
    window.localStorage.setItem("localgo.auth.refresh-token", "saved-refresh");
    refreshAuthTokenMock.mockResolvedValue({ accessToken: "renewed", refreshToken: "rotated" });
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await screen.findByText("authenticated");
    expect(refreshAuthTokenMock).toHaveBeenCalledWith("saved-refresh");
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it("clears a rejected saved session without automatically requesting Zalo login", async () => {
    window.localStorage.setItem("localgo.auth.access-token", "expired");
    window.localStorage.setItem("localgo.auth.refresh-token", "revoked");
    getCurrentUserMock.mockRejectedValueOnce(new AuthRequestError("Expired", 401));
    refreshAuthTokenMock.mockRejectedValueOnce(new AuthRequestError("Revoked", 401));
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await screen.findByText("error");
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBeNull();
    expect(window.localStorage.getItem("localgo.auth.access-token")).toBeNull();
    expect(authorizeMock).not.toHaveBeenCalled();
    expect(loginWithZaloMock).not.toHaveBeenCalled();
  });

  it("clears saved tokens on refresh failure and requires a fresh login on reopening", async () => {
    window.localStorage.setItem("localgo.auth.access-token", "expired");
    window.localStorage.setItem("localgo.auth.refresh-token", "saved-refresh");
    getCurrentUserMock.mockRejectedValueOnce(new AuthRequestError("Expired", 401));
    refreshAuthTokenMock.mockRejectedValueOnce(new AuthRequestError("Offline", 0));
    const first = render(<AuthProvider><AuthProbe /></AuthProvider>);
    await screen.findByText("error");
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBeNull();
    expect(window.localStorage.getItem("localgo.auth.access-token")).toBeNull();
    expect(authorizeMock).not.toHaveBeenCalled();
    first.unmount();
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("migrates legacy storage and clears both stores on logout", async () => {
    window.sessionStorage.setItem("localgo.auth.access-token", "legacy-access");
    window.sessionStorage.setItem("localgo.auth.refresh-token", "legacy-refresh");
    const first = render(<AuthProvider><AuthProbe /></AuthProvider>);
    await screen.findByText("authenticated");
    expect(window.localStorage.getItem("localgo.auth.access-token")).toBe("legacy-access");
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBe("legacy-refresh");
    await userEvent.setup().click(screen.getByRole("button", { name: "Logout" }));
    for (const storage of [window.localStorage, window.sessionStorage]) {
      expect(storage.getItem("localgo.auth.access-token")).toBeNull();
      expect(storage.getItem("localgo.auth.refresh-token")).toBeNull();
    }
    first.unmount();
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it("stops login when the user does not grant profile access", async () => {
    authorizeMock.mockResolvedValue({ "scope.userInfo": false });
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
    expect(
      screen.getByText(
        "Vui lòng cấp quyền truy cập thông tin Zalo để tiếp tục sử dụng LocalGo."
      )
    ).toBeInTheDocument();
    expect(getZaloAccessTokenMock).not.toHaveBeenCalled();
    expect(loginWithZaloMock).not.toHaveBeenCalled();
  });

  it("keeps the explicit ID-only login option available", async () => {
    render(
      <AuthProvider>
        <AuthProbe requestPermission={false} />
      </AuthProvider>
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(screen.getByText("authenticated")).toBeInTheDocument());
    expect(authorizeMock).not.toHaveBeenCalled();
    expect(getZaloAccessTokenMock).toHaveBeenCalledOnce();
  });

  it("refreshes an expired profile API token with the existing auth session and stays authenticated", async () => {
    window.sessionStorage.setItem("localgo.auth.access-token", "test-only-old");
    window.sessionStorage.setItem("localgo.auth.refresh-token", "test-only-refresh");
    refreshAuthTokenMock.mockResolvedValue({ accessToken: "test-only-new", refreshToken: "test-only-rotated", expiresAt: "2026-11-20T00:00:00Z" });
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Expired" } }), { status: 401, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { businessName: "Cơ sở" } }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    render(<AuthProvider><AuthProbe /><AuthenticatedProfileProbe /></AuthProvider>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Đăng nhập" }));
    await screen.findByText("authenticated");
    await userEvent.setup().click(screen.getByRole("button", { name: "Tải hồ sơ" }));
    await screen.findByText("Cơ sở");
    expect(refreshAuthTokenMock).toHaveBeenCalledWith("test-only-refresh");
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer test-only-new");
    expect(window.localStorage.getItem("localgo.auth.access-token")).toBe("test-only-new");
    expect(screen.getByText("authenticated")).toBeInTheDocument();
    expect(loginWithZaloMock).not.toHaveBeenCalled();
    expect(authorizeMock).not.toHaveBeenCalled();
  });

  it("shares one rotation for concurrent 401s and persists both replacement tokens", async () => {
    window.localStorage.setItem("localgo.auth.access-token", "old");
    window.localStorage.setItem("localgo.auth.refresh-token", "refresh");
    let finish!: (tokens: object) => void;
    refreshAuthTokenMock.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const fetch = vi.fn().mockImplementation(async (_url, init) => init.headers.Authorization === "Bearer old"
      ? new Response(null, { status: 401 })
      : new Response(JSON.stringify({ success: true, data: {} }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await screen.findByText("authenticated");
    const first = apiRequest("/private-one", { headers: { Authorization: "Bearer old" } });
    const second = apiRequest("/private-two", { headers: { Authorization: "Bearer old" } });
    await waitFor(() => expect(refreshAuthTokenMock).toHaveBeenCalledTimes(1));
    await act(async () => { finish({ accessToken: "new", refreshToken: "rotated" }); await Promise.all([first, second]); });
    expect(window.localStorage.getItem("localgo.auth.access-token")).toBe("new");
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBe("rotated");
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("204 change forces logout, clears private cache and blocks old credentials even if rotation finishes late", async () => {
    window.localStorage.setItem("localgo.auth.access-token", "old");
    window.localStorage.setItem("localgo.auth.refresh-token", "refresh");
    let finish!: (tokens: object) => void;
    refreshAuthTokenMock.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await screen.findByText("authenticated");
    writeBusinessProfileCache(businessProfileKeys.mine(profile.id), { private: true });
    const refreshing = session.refreshSession().catch(() => undefined);
    await act(async () => {
      await changePassword("old", { currentPassword: "oldSecret123", newPassword: "newSecret456", newPasswordConfirmation: "newSecret456" });
      session.forceLogout();
    });
    await act(async () => { finish({ accessToken: "late", refreshToken: "late-refresh" }); await refreshing; });
    expect(session.user).toBeNull(); expect(session.accessToken).toBeNull();
    for (const storage of [window.localStorage, window.sessionStorage]) {
      expect(storage.getItem("localgo.auth.access-token")).toBeNull();
      expect(storage.getItem("localgo.auth.refresh-token")).toBeNull();
    }
    expect(readBusinessProfileCache(businessProfileKeys.mine(profile.id))).toBeUndefined();
    await expect(apiRequest("/private", { headers: { Authorization: "Bearer old" } })).rejects.toMatchObject({ status: 401, authHandled: true });
    await expect(session.refreshSession()).rejects.toMatchObject({ status: 401 });
    await expect(session.authenticate()).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(refreshAuthTokenMock).toHaveBeenCalledTimes(1);
    expect(session.status).toBe("idle");
  });

  it("clears both tokens and requests login when refresh fails", async () => {
    window.localStorage.setItem("localgo.auth.access-token", "old");
    window.localStorage.setItem("localgo.auth.refresh-token", "refresh");
    refreshAuthTokenMock.mockRejectedValue(new AuthRequestError("Expired", 401));
    const login = vi.fn();
    window.addEventListener("localgo:auth-required", login);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await screen.findByText("authenticated");
    await act(async () => { await expect(apiRequest("/private", { headers: { Authorization: "Bearer old" } })).rejects.toMatchObject({ status: 401 }); });
    expect(session.user).toBeNull();
    expect(window.localStorage.getItem("localgo.auth.access-token")).toBeNull();
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBeNull();
    expect(login).toHaveBeenCalled();
    window.removeEventListener("localgo:auth-required", login);
  });

  it("allows explicit email login after forced logout and stores only the new token pair", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { accessToken: "email-access", refreshToken: "email-refresh" } }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    render(<AuthProvider><SessionProbe /></AuthProvider>);
    act(() => session.forceLogout());
    await act(async () => { await session.loginEmail("garden@example.com", "Secret123"); });
    expect(fetch.mock.calls[0][0]).toMatch(/\/auth\/login$/);
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
    expect(window.localStorage.getItem("localgo.auth.access-token")).toBe("email-access");
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBe("email-refresh");
    expect(JSON.stringify(window.localStorage)).not.toContain("Secret123");
    expect(session.status).toBe("authenticated");
    expect(refreshAuthTokenMock).not.toHaveBeenCalled();
  });
});
