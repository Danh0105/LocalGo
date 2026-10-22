import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const actual =
    await vi.importActual<typeof import("@/services/auth")>("@/services/auth");
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
              : { requestUserInfoPermission: requestPermission },
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

describe("AuthProvider Zalo login", () => {
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
      </AuthProvider>,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() =>
      expect(screen.getByText("authenticated")).toBeInTheDocument(),
    );
    expect(authorizeMock).toHaveBeenCalledWith({ scopes: ["scope.userInfo"] });
    expect(getZaloAccessTokenMock).toHaveBeenCalledOnce();
    expect(authorizeMock.mock.invocationCallOrder[0]).toBeLessThan(
      getZaloAccessTokenMock.mock.invocationCallOrder[0],
    );
    expect(loginWithZaloMock).toHaveBeenCalledWith("zalo-access-token");
    expect(window.sessionStorage.getItem("localgo.auth.access-token")).toBe(
      "localgo-access-token",
    );
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBe(
      "localgo-refresh-token",
    );
    expect(
      window.sessionStorage.getItem("localgo.auth.refresh-token"),
    ).toBeNull();
  });

  it("restores a persisted session on the next app launch without asking Zalo again", async () => {
    window.localStorage.setItem(
      "localgo.auth.refresh-token",
      "persisted-refresh-token",
    );
    refreshAuthTokenMock.mockResolvedValue({
      accessToken: "restored-access-token",
      refreshToken: "rotated-refresh-token",
      expiresAt: "2026-11-20T00:00:00.000Z",
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("authenticated")).toBeInTheDocument(),
    );
    expect(refreshAuthTokenMock).toHaveBeenCalledWith(
      "persisted-refresh-token",
    );
    expect(window.localStorage.getItem("localgo.auth.refresh-token")).toBe(
      "rotated-refresh-token",
    );
    expect(authorizeMock).not.toHaveBeenCalled();
    expect(getZaloAccessTokenMock).not.toHaveBeenCalled();
    expect(loginWithZaloMock).not.toHaveBeenCalled();
  });

  it("stops login when the user does not grant profile access", async () => {
    authorizeMock.mockResolvedValue({ "scope.userInfo": false });
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
    expect(
      screen.getByText(
        "Vui lòng cấp quyền truy cập thông tin Zalo để tiếp tục sử dụng LocalGo.",
      ),
    ).toBeInTheDocument();
    expect(getZaloAccessTokenMock).not.toHaveBeenCalled();
    expect(loginWithZaloMock).not.toHaveBeenCalled();
  });

  it("keeps the explicit ID-only login option available", async () => {
    render(
      <AuthProvider>
        <AuthProbe requestPermission={false} />
      </AuthProvider>,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() =>
      expect(screen.getByText("authenticated")).toBeInTheDocument(),
    );
    expect(authorizeMock).not.toHaveBeenCalled();
    expect(getZaloAccessTokenMock).toHaveBeenCalledOnce();
  });
});
