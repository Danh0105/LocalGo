import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationProvider, useNotifications } from "./notification-context";
import type { AppNotification } from "@/services/notifications";
import { TRADE_POST_UNAVAILABLE_MESSAGE } from "@/services/notifications";
import { TradePostRequestError } from "@/services/trade-posts";
import NotificationsPage from "@/pages/notifications";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), snackbar: vi.fn(), postDetail: vi.fn() }));
vi.mock("@/services/trade-posts", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/trade-posts")>(),
  getTradePostDetail: mocks.postDetail,
}));
vi.mock("zmp-ui", () => ({
  Page: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  useNavigate: () => mocks.navigate,
  useSnackbar: () => ({ openSnackbar: mocks.snackbar }),
}));
vi.mock("@/contexts/auth-context", () => ({
  useCurrentUser: () => ({ accessToken: "token", status: "authenticated" }),
}));
vi.mock("@/services/notification-socket", () => ({
  createNotificationSocket: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
}));
vi.mock("@/components/notification-alert", () => ({ default: () => null }));

const notification = (data: AppNotification["data"], type = "TRADE_POST_NEW"): AppNotification => ({
  id: "notification-id", type, data, title: "Tin giao thương", body: "Nội dung",
  readAt: null, createdAt: "2026-10-21T00:00:00Z",
});
let resolved: AppNotification;
let detailStatus: number;
let listed: AppNotification | null;
let readPending: boolean;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.postDetail.mockReset();
  mocks.postDetail.mockResolvedValue({ id: "post-id", slug: "verified-slug" });
  detailStatus = 200;
  listed = null;
  readPending = false;
  resolved = notification({
    tradePostId: "post-id", tradePostSlug: "slug mới/vườn & trái",
    slug: "slug-cu", tradePostTarget: "PUBLIC_DETAIL", tradePostAvailable: true,
  });
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    if (input.endsWith("/notifications/unread-count")) {
      return new Response(JSON.stringify({ success: true, data: { unreadCount: 1 } }));
    }
    if (input.includes("/notifications?")) {
      return new Response(JSON.stringify({ success: true, data: [listed ?? resolved] }));
    }
    if (input.endsWith("/read")) {
      if (readPending) return new Promise<Response>(() => undefined);
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify(detailStatus === 200
      ? { success: true, data: resolved }
      : { success: false, error: { code: "FAIL", message: "Không thể tải thông báo." } }),
    { status: detailStatus });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup() {
  return renderHook(useNotifications, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    ),
  });
}

describe("notification trade destinations", () => {
  it("opens a clicked notification while marking it read is still pending", async () => {
    readPending = true;
    render(<NotificationProvider><NotificationsPage /></NotificationProvider>);
    fireEvent.click(await screen.findByRole("button", { name: /Tin giao thương/ }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(
      `/trade/${encodeURIComponent("slug mới/vườn & trái")}`, { state: { reviewId: "" } }));
  });

  it("rechecks an unavailable row on click instead of silently disabling the button", async () => {
    listed = notification({ ...resolved.data, tradePostAvailable: false });
    render(<NotificationProvider><NotificationsPage /></NotificationProvider>);
    const row = await screen.findByRole("button", { name: /Tin giao thương/ });
    expect(row).toBeEnabled();
    fireEvent.click(row);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(
      `/trade/${encodeURIComponent("slug mới/vườn & trái")}`, { state: { reviewId: "" } }));
  });

  it("responds visibly to a click when the post is still unavailable", async () => {
    resolved = notification({ ...resolved.data, tradePostAvailable: false });
    render(<NotificationProvider><NotificationsPage /></NotificationProvider>);
    fireEvent.click(await screen.findByRole("button", { name: /Tin giao thương/ }));
    await waitFor(() => expect(mocks.snackbar).toHaveBeenCalledWith({
      text: TRADE_POST_UNAVAILABLE_MESSAGE, type: "warning",
    }));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("refreshes an old payload and opens the current canonical slug encoded once", async () => {
    const { result } = setup();
    await act(() => result.current.openNotification(notification({ tradePostId: "post-id", slug: "old" })));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/notifications/notification-id"),
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }));
    expect(mocks.navigate).toHaveBeenCalledWith(
      `/trade/${encodeURIComponent("slug mới/vườn & trái")}`, { state: { reviewId: "" } });
  });

  it.each(["TRADE_POST_APPROVED", "TRADE_POST_REJECTED", "TRADE_POST_HIDDEN"])(
    "opens owner management by ID for %s even with a public slug present", async (type) => {
      resolved = notification({ ...resolved.data, tradePostTarget: "OWNER_MANAGE", reason: "Cần sửa" }, type);
      const { result } = setup();
      await act(() => result.current.openNotification(resolved));
      expect(mocks.navigate).toHaveBeenCalledWith("/trade/manage/posts/post-id/edit", {
        state: { flashMessage: "Cần sửa" },
      });
    });

  it.each(["NOT_FOUND", "DELETED", "NOT_PUBLIC"])("blocks an unavailable post: %s", async (reason) => {
    const old = resolved;
    resolved = notification({ ...resolved.data, tradePostAvailable: false, tradePostUnavailableReason: reason });
    const { result } = setup();
    await act(() => result.current.openNotification(old));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.snackbar).toHaveBeenCalledWith({ text: TRADE_POST_UNAVAILABLE_MESSAGE, type: "warning" });
  });

  it.each([
    { tradePostSlug: "", slug: "" },
    { tradePostTarget: "OWNER_MANAGE", tradePostId: "" },
    { tradePostTarget: "ADMIN_MANAGE" },
  ])("never substitutes an ID or another destination for incomplete/unsupported data %j", async (data) => {
    resolved = notification({ ...resolved.data, ...data });
    const { result } = setup();
    await act(() => result.current.openNotification(resolved));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.snackbar).toHaveBeenCalled();
  });

  it("keeps the review ID when opening a public review notification", async () => {
    resolved = notification({ ...resolved.data, reviewId: "review-id" }, "TRADE_REVIEW_REPLIED");
    const { result } = setup();
    await act(() => result.current.openNotification(resolved));
    expect(mocks.navigate).toHaveBeenCalledWith(expect.stringContaining("/trade/"), {
      state: { reviewId: "review-id" },
    });
  });

  it("verifies legacy payloads without availability metadata before opening", async () => {
    resolved = notification({ tradePostId: "post-id", slug: "legacy-slug" });
    const { result } = setup();
    await act(() => result.current.openNotification(resolved));
    expect(mocks.postDetail).toHaveBeenCalledWith("legacy-slug");
    expect(mocks.navigate).toHaveBeenCalledWith("/trade/verified-slug");
  });

  it("uses the verified public post when notification detail is unavailable", async () => {
    detailStatus = 404;
    const { result } = setup();
    await act(() => result.current.openNotification(resolved));
    expect(mocks.postDetail).toHaveBeenCalledWith("slug mới/vườn & trái");
    expect(mocks.navigate).toHaveBeenCalledWith("/trade/verified-slug", { state: { reviewId: "" } });
  });

  it("does not fall back to a stale slug when refreshing and verification fail", async () => {
    detailStatus = 503;
    mocks.postDetail.mockRejectedValue(new Error("Không thể tải tin."));
    const { result } = setup();
    await act(async () => {
      await expect(result.current.openNotification(resolved)).rejects.toThrow("Không thể tải tin.");
    });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("does not open a different post that reuses an old slug", async () => {
    resolved = notification({ tradePostId: "post-id", slug: "old-slug" });
    mocks.postDetail.mockResolvedValue({ id: "different-post", slug: "old-slug" });
    const { result } = setup();
    await act(() => result.current.openNotification(resolved));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.snackbar).toHaveBeenCalledWith({ text: TRADE_POST_UNAVAILABLE_MESSAGE, type: "warning" });
  });

  it("shows unavailable feedback when legacy post verification returns 404", async () => {
    resolved = notification({ tradePostId: "post-id", slug: "old-slug" });
    mocks.postDetail.mockRejectedValue(new TradePostRequestError("Removed", 404));
    const { result } = setup();
    await act(() => result.current.openNotification(resolved));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.snackbar).toHaveBeenCalledWith({ text: TRADE_POST_UNAVAILABLE_MESSAGE, type: "warning" });
  });

  it("keeps conversation notifications on the conversation screen", async () => {
    const { result } = setup();
    await act(() => result.current.openNotification(notification({
      tradePostId: "post-id", conversationId: "conversation-id",
    }, "TRADE_CONVERSATION_STARTED")));
    expect(mocks.navigate).toHaveBeenCalledWith("/trade/messages/conversation-id");
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining("/notifications/notification-id"), expect.anything());
  });
});
