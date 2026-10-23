import { StrictMode, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GardenCredentials from "./garden-credentials";
import BusinessProfileView from "./business-profile-view";
import { businessProfileKeys, readBusinessProfileCache } from "@/lib/business-profile-cache";
import type { BusinessProfile } from "@/types/business-profiles";

const mock = vi.hoisted(() => ({
  pathname: "/business/profile", navigate: vi.fn(), snackbar: vi.fn(), refreshUser: vi.fn(), forceLogout: vi.fn(),
  user: { id: "owner", role: "BUSINESS", businessType: "GARDEN", email: "login@example.com" },
}));
vi.mock("zmp-ui", () => ({
  Page: ({ children }: { children: ReactNode }) => <div>{children}</div>, Icon: () => null,
  useLocation: () => ({ pathname: mock.pathname }), useNavigate: () => mock.navigate, useSnackbar: () => ({ openSnackbar: mock.snackbar }),
}));
vi.mock("@/contexts/auth-context", () => ({ useCurrentUser: () => ({ user: mock.user, accessToken: "test-access", status: "authenticated", refreshUser: mock.refreshUser, forceLogout: mock.forceLogout }) }));
vi.mock("zmp-sdk/apis", () => ({ openPhone: vi.fn(), openOutApp: vi.fn() }));
const profile = { id: "garden", userId: "owner", businessType: "GARDEN", businessName: "Vườn LocalGo", contactPhone: "0900123456", contactEmail: "public@example.com", contactName: "Chủ vườn", address: "Truông Mít", isPublic: true } as BusinessProfile;
const status = { email: "login@example.com", passwordConfigured: false, initialPasswordAcknowledged: false, canIssueInitialPassword: true };
const json = (data: unknown, cache = "no-store, private") => new Response(JSON.stringify({ success: true, data }), { headers: { "Content-Type": "application/json", "Cache-Control": cache } });
const errorResponse = (status: number, code: string) => new Response(JSON.stringify({ success: false, error: { code, message: code } }), { status, headers: { "Content-Type": "application/json" } });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_GARDEN_INITIAL_PASSWORD_ENABLED", "true");
  mock.pathname = "/business/profile";
  mock.user = { id: "owner", role: "BUSINESS", businessType: "GARDEN", email: "login@example.com" };
  mock.refreshUser.mockImplementation(async () => mock.user);
  fetchMock = vi.fn().mockImplementation(async (url: string) => url.endsWith("/acknowledge") ? new Response(null, { status: 204 }) : url.endsWith("/initial-password") ? json({ password: "InitialGarden4827", requiresAcknowledgement: true }) : json(status));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("private garden login information", () => {
  it.each([["USER", "GARDEN"], ["ADMIN", "GARDEN"], ["MODERATOR", "GARDEN"], ["BUSINESS", "RESTAURANT"]])("does not render or request credentials for %s/%s", (role, businessType) => {
    mock.user = { ...mock.user, role, businessType };
    render(<GardenCredentials profile={profile} />);
    expect(screen.queryByRole("region", { name: "Thông tin đăng nhập" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never requests another owner's credentials or adds them to the public view", () => {
    const first = render(<GardenCredentials profile={{ ...profile, userId: "other" }} />);
    expect(fetchMock).not.toHaveBeenCalled(); first.unmount();
    mock.pathname = "/business-profiles/garden";
    render(<BusinessProfileView profile={profile} />);
    expect(screen.queryByText("Thông tin đăng nhập")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("verifies the API user before issuing credentials", async () => {
    mock.refreshUser.mockResolvedValue({ ...mock.user, businessType: "RESTAURANT" });
    render(<GardenCredentials profile={profile} />);
    await waitFor(() => expect(screen.queryByText("Đang tải thông tin đăng nhập…")).toBeNull());
    expect(screen.queryByText("Thông tin đăng nhập")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("issues once across StrictMode effect replay, masks initially, and never persists plaintext", async () => {
    const { rerender } = render(<StrictMode><GardenCredentials profile={profile} /></StrictMode>);
    await screen.findByRole("region", { name: "Mật khẩu đăng nhập của bạn" });
    rerender(<StrictMode><GardenCredentials profile={{ ...profile }} /></StrictMode>);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/initial-password"))).toHaveLength(1);
    expect(screen.queryByText("InitialGarden4827")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu ban đầu" }));
    expect(screen.getByText("InitialGarden4827")).toBeInTheDocument();
    expect(screen.getByText("login@example.com")).toBeInTheDocument();
    expect(screen.queryByText("public@example.com")).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain("InitialGarden4827");
    expect(JSON.stringify(sessionStorage)).not.toContain("InitialGarden4827");
    expect(readBusinessProfileCache(businessProfileKeys.mine("owner"))).toBeUndefined();
    for (const [, init] of fetchMock.mock.calls) expect(init.cache).toBe("no-store");
  });
  it("copies only the initial password and acknowledges only after an explicit click", async () => {
    const user = userEvent.setup();
    const clipboard = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const { unmount } = render(<GardenCredentials profile={profile} />);
    await user.click(await screen.findByRole("button", { name: "Sao chép mật khẩu" }));
    expect(clipboard).toHaveBeenCalledWith("InitialGarden4827");
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/acknowledge"))).toBe(false);
    await user.click(screen.getByRole("button", { name: "Tôi đã lưu mật khẩu" }));
    await screen.findByRole("button", { name: "Đổi mật khẩu" });
    expect(screen.queryByRole("region", { name: "Mật khẩu đăng nhập của bạn" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Hiện mật khẩu|Sao chép mật khẩu/ })).toBeNull();
    expect(screen.queryByText("InitialGarden4827")).toBeNull();
    unmount();
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/acknowledge"))).toHaveLength(1);
  });
  it("does not acknowledge on exit, clears the display, and asks the backend for a fresh password on re-entry", async () => {
    const first = render(<GardenCredentials profile={profile} />);
    await screen.findByRole("button", { name: "Tôi đã lưu mật khẩu" });
    mock.pathname = "/"; first.rerender(<GardenCredentials profile={profile} />);
    expect(screen.queryByText("Thông tin đăng nhập")).toBeNull(); first.unmount();
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/acknowledge"))).toBe(false);
    mock.pathname = "/business/profile";
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/initial-password") ? json({ password: "NewInitialGarden123", requiresAcknowledgement: true }) : json(status));
    render(<GardenCredentials profile={profile} />);
    await userEvent.click(await screen.findByRole("button", { name: "Hiện mật khẩu ban đầu" }));
    expect(screen.getByText("NewInitialGarden123")).toBeInTheDocument();
    expect(screen.queryByText("InitialGarden4827")).toBeNull();
  });
  it("never issues or exposes current-password controls after acknowledgement and opens change inline", async () => {
    fetchMock.mockImplementation(async () => json({ ...status, passwordConfigured: true, initialPasswordAcknowledged: true, canIssueInitialPassword: false }));
    render(<GardenCredentials profile={profile} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Đổi mật khẩu" }));
    expect(await screen.findByLabelText("Mật khẩu hiện tại")).toBeInTheDocument();
    expect(mock.navigate).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Đóng form đổi mật khẩu" }));
    expect(screen.queryByLabelText("Mật khẩu hiện tại")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Quên mật khẩu?" }));
    expect(mock.navigate).toHaveBeenCalledWith("/forgot-password");
  });
  it("keeps production issuance disabled until the backend feature is enabled", async () => {
    vi.stubEnv("VITE_GARDEN_INITIAL_PASSWORD_ENABLED", "false");
    render(<GardenCredentials profile={profile} />);
    await screen.findByText("Thông tin đăng nhập đang được chuẩn bị. Bạn có thể yêu cầu đặt lại mật khẩu qua email.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Tôi đã lưu mật khẩu" })).toBeNull();
  });
  it("does not display plaintext when the server omits private no-store headers", async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/initial-password") ? json({ password: "InitialGarden4827", requiresAcknowledgement: true }, "public, max-age=300") : json(status));
    render(<GardenCredentials profile={profile} />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Hiện mật khẩu ban đầu" })).toBeNull();
    expect(screen.queryByText("InitialGarden4827")).toBeNull();
  });
  it("handles concurrent-acknowledged conflict without displaying any password again", async () => {
    let acknowledged = false;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/initial-password")) { acknowledged = true; return errorResponse(409, "INITIAL_PASSWORD_ALREADY_ACKNOWLEDGED"); }
      return json(acknowledged ? { ...status, passwordConfigured: true, initialPasswordAcknowledged: true, canIssueInitialPassword: false } : status);
    });
    render(<GardenCredentials profile={profile} />);
    await screen.findByRole("button", { name: "Đổi mật khẩu" });
    expect(screen.queryByRole("button", { name: "Hiện mật khẩu ban đầu" })).toBeNull();
  });
  it("does not retry 429 issuance automatically", async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/initial-password") ? errorResponse(429, "RATE_LIMIT_EXCEEDED") : json(status));
    render(<GardenCredentials profile={profile} />);
    await screen.findByText("Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not issue a password after the owner leaves while status is loading", async () => {
    let complete!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const { rerender } = render(<GardenCredentials profile={profile} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    mock.pathname = "/";
    rerender(<GardenCredentials profile={profile} />);
    await act(async () => { complete(json(status)); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Thông tin đăng nhập")).toBeNull();
  });
  it("prevents duplicate acknowledgement while pending and retains the initial password after failure", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementation(async (url: string) => url.endsWith("/acknowledge") ? new Promise((resolve) => { finish = resolve; }) : url.endsWith("/initial-password") ? json({ password: "InitialGarden4827", requiresAcknowledgement: true }) : json(status));
    render(<GardenCredentials profile={profile} />);
    const button = await screen.findByRole("button", { name: "Tôi đã lưu mật khẩu" });
    fireEvent.click(button); fireEvent.click(button);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/acknowledge"))).toHaveLength(1);
    await act(async () => { finish(errorResponse(429, "RATE_LIMIT_EXCEEDED")); });
    await screen.findByText("Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.");
    expect(screen.getByRole("button", { name: "Hiện mật khẩu ban đầu" })).toBeInTheDocument();
  });
});
