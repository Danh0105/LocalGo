import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useAuthenticatedRequest } from "@/hooks/use-authenticated-request";
import { getMyBusinessProfile } from "@/services/business-profiles";

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
  const { authenticate, status, error } = useCurrentUser();
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
      <p>{error}</p>
    </>
  );
}

function AuthenticatedProfileProbe() {
  const request = useAuthenticatedRequest();
  const [message, setMessage] = useState("");
  return <><button type="button" onClick={() => void request((token) => getMyBusinessProfile(token, "localgo-user-1")).then((result) => setMessage(result.businessName)).catch(() => setMessage("Tải hồ sơ thất bại"))}>Tải hồ sơ</button><p>{message}</p></>;
}

describe("AuthProvider Zalo login", () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    window.sessionStorage.clear();
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
    expect(window.sessionStorage.getItem("localgo.auth.access-token")).toBe("test-only-new");
    expect(screen.getByText("authenticated")).toBeInTheDocument();
    expect(loginWithZaloMock).not.toHaveBeenCalled();
    expect(authorizeMock).not.toHaveBeenCalled();
  });
});
