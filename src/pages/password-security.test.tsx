import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import PasswordSecurityPage, { ChangePasswordPanel } from "./password-security";
import { ApiRequestError } from "@/lib/http-client";
import { FORGOT_PASSWORD_MESSAGE } from "@/services/password";

const mock = vi.hoisted(() => ({
  navigate: vi.fn(), snackbar: vi.fn(), change: vi.fn(), forgot: vi.fn(), reset: vi.fn(),
  auth: { user: { role: "BUSINESS", businessType: "GARDEN" }, accessToken: "access", status: "authenticated", refreshUser: vi.fn(), forceLogout: vi.fn() },
  location: { pathname: "/business/profile", search: "" },
}));
vi.mock("zmp-ui", () => ({ Page: ({ children }: { children: ReactNode }) => <div>{children}</div>, useNavigate: () => mock.navigate, useLocation: () => mock.location, useSnackbar: () => ({ openSnackbar: mock.snackbar }) }));
vi.mock("@/contexts/auth-context", () => ({ useCurrentUser: () => mock.auth }));
vi.mock("@/services/password", async () => ({ ...await vi.importActual<typeof import("@/services/password")>("@/services/password"), changePassword: mock.change, forgotPassword: mock.forgot, resetPassword: mock.reset }));
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.user = { role: "BUSINESS", businessType: "GARDEN" };
  mock.auth.refreshUser.mockImplementation(async () => mock.auth.user);
  mock.location = { pathname: "/business/profile", search: "" };
  mock.change.mockResolvedValue(undefined); mock.reset.mockResolvedValue(undefined); mock.forgot.mockResolvedValue({ message: "not shown" });
});
afterEach(cleanup);
async function fill(change = true) {
  const user = userEvent.setup();
  if (change) await user.type(await screen.findByLabelText("Mật khẩu hiện tại"), "OldSecret123");
  await user.type(screen.getByLabelText("Mật khẩu mới"), "NewSecret456");
  await user.type(screen.getByLabelText("Xác nhận mật khẩu mới"), "NewSecret456");
  return user;
}
describe("garden password screens", () => {
  it("blocks invalid input without API calls and toggles each field independently", async () => {
    render(<ChangePasswordPanel onClose={vi.fn()} />);
    await screen.findByLabelText("Mật khẩu hiện tại");
    await userEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect(mock.change).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu mới" }));
    expect(screen.getByLabelText("Mật khẩu mới")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Mật khẩu hiện tại")).toHaveAttribute("type", "password");
  });
  it("retains passwords and focuses current password on invalid-current error", async () => {
    mock.change.mockRejectedValue(new ApiRequestError("invalid", { status: 401, code: "CURRENT_PASSWORD_INVALID" }));
    render(<ChangePasswordPanel onClose={vi.fn()} />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect(await screen.findByText("Mật khẩu hiện tại không đúng.")).toBeInTheDocument();
    expect(screen.getByLabelText("Mật khẩu hiện tại")).toHaveValue("OldSecret123");
    expect(screen.getByLabelText("Mật khẩu mới")).toHaveValue("NewSecret456");
    expect(screen.getByLabelText("Mật khẩu hiện tại")).toHaveFocus();
    expect(mock.auth.forceLogout).not.toHaveBeenCalled();
  });
  it("clears passwords and forces logout after successful change", async () => {
    render(<ChangePasswordPanel onClose={vi.fn()} />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    await waitFor(() => expect(mock.auth.forceLogout).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Mật khẩu mới")).toHaveValue("");
    expect(mock.navigate).toHaveBeenCalledWith("/login", { replace: true });
    expect(mock.snackbar).toHaveBeenCalledWith(expect.objectContaining({ text: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." }));
  });
  it("maps field validation and removes secrets echoed by the server", async () => {
    mock.change.mockRejectedValue(new ApiRequestError("bad", { status: 400, code: "VALIDATION_ERROR", details: [{ field: "newPassword", message: "Không dùng NewSecret456" }] }));
    render(<ChangePasswordPanel onClose={vi.fn()} />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect(await screen.findByText("Không dùng ••••")).toBeInTheDocument();
    expect(screen.getByLabelText("Mật khẩu mới")).toHaveValue("NewSecret456");
    expect(screen.queryByText("Không dùng NewSecret456")).toBeNull();
  });
  it("does not duplicate a pending submission and retains form after 429", async () => {
    let reject!: (error: unknown) => void;
    mock.change.mockImplementation(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    render(<ChangePasswordPanel onClose={vi.fn()} />);
    await fill();
    const form = screen.getByRole("button", { name: "Đổi mật khẩu" }).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(mock.change).toHaveBeenCalledTimes(1);
    reject(new ApiRequestError("limit", { status: 429, code: "RATE_LIMIT_EXCEEDED" }));
    await screen.findByText("Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.");
    expect(screen.getByLabelText("Mật khẩu mới")).toHaveValue("NewSecret456");
  });
  it.each(["existing@example.com", "unknown@example.com"])("uses the same forgot response for %s", async (email) => {
    mock.location.pathname = "/forgot-password";
    render(<PasswordSecurityPage mode="forgot" />);
    await userEvent.type(screen.getByLabelText("Email"), email);
    await userEvent.click(screen.getByRole("button", { name: "Gửi hướng dẫn" }));
    expect(await screen.findByText(FORGOT_PASSWORD_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quay lại đăng nhập" })).toBeInTheDocument();
  });
  it("reads the opaque URL token once, removes it, and clears secrets after reset", async () => {
    mock.location = { pathname: "/reset-password", search: "?token=opaque-once&lang=vi" };
    const { rerender } = render(<PasswordSecurityPage mode="reset" />);
    await waitFor(() => expect(mock.navigate).toHaveBeenCalledWith("/reset-password?lang=vi", { replace: true }));
    mock.location.search = "?lang=vi";
    rerender(<PasswordSecurityPage mode="reset" />);
    const user = await fill(false);
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(mock.reset).toHaveBeenCalledWith("opaque-once", { currentPassword: "", newPassword: "NewSecret456", newPasswordConfirmation: "NewSecret456" });
    expect(mock.auth.forceLogout).toHaveBeenCalledTimes(1);
    expect(mock.navigate).toHaveBeenCalledWith("/login", { replace: true });
    expect(window.localStorage.getItem("token")).toBeNull();
  });
  it("does not submit a missing token", () => {
    mock.location = { pathname: "/reset-password", search: "" };
    render(<PasswordSecurityPage mode="reset" />);
    expect(screen.getByText("Liên kết đặt lại mật khẩu không hợp lệ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yêu cầu liên kết mới" })).toBeInTheDocument();
    expect(mock.reset).not.toHaveBeenCalled();
  });
  it("uses a common invalid/expired/used token error and offers another link", async () => {
    mock.location = { pathname: "/reset-password", search: "?token=used" };
    mock.reset.mockRejectedValue(new ApiRequestError("bad token", { status: 400, code: "INVALID_PASSWORD_RESET_TOKEN" }));
    render(<PasswordSecurityPage mode="reset" />);
    const user = await fill(false);
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(await screen.findByText("Liên kết không hợp lệ hoặc đã hết hạn.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi lại liên kết" })).toBeInTheDocument();
  });
});
