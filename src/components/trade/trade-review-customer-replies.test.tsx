import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TradeReviewCustomerReplies from "./trade-review-customer-replies";
import type { TradeReviewResponse } from "@/services/trade-posts";

const auth = vi.hoisted(() => ({
  user: { id: "customer" } as { id: string } | null,
  accessToken: "test-token" as string | null,
  authenticate: vi.fn(),
}));
vi.mock("@/contexts/auth-context", () => ({ useCurrentUser: () => auth }));

const reply = {
  id: "reply-1", reviewId: "review/1", userId: "customer",
  content: "Cảm ơn chủ tin!", createdAt: "2026-10-21T03:00:00Z",
  author: { id: "customer", displayName: "Khách A", avatarUrl: "/uploads/avatar.jpg" },
};
const review: TradeReviewResponse = {
  id: "review/1", tradePostId: "post/1", userId: "reviewer", rating: 5,
  content: "Dịch vụ tốt", status: "PUBLISHED", replyContent: "Cảm ơn bạn",
  repliedAt: "2026-10-21T02:00:00Z", createdAt: "2026-10-20T03:00:00Z",
  updatedAt: "2026-10-21T02:00:00Z", images: [], reviewer: null, tradePost: null,
};
const ok = () => new Response(JSON.stringify({ success: true, data: reply }));
const openComposer = () => fireEvent.click(screen.getByRole("button", { name: "Trả lời chủ tin" }));
const fill = (value = "  Cảm ơn chủ tin!  ") => fireEvent.change(screen.getByRole("textbox"), { target: { value } });
const send = () => fireEvent.click(screen.getByRole("button", { name: "Gửi trả lời" }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: "customer" };
  auth.accessToken = "test-token";
  vi.stubGlobal("fetch", vi.fn(async () => ok()));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("public customer replies to trade owners", () => {
  it("posts trimmed content to the review and displays the persisted result", async () => {
    const onReply = vi.fn();
    function Thread() {
      const [item, setItem] = useState(review);
      return <TradeReviewCustomerReplies review={item} ownerId="owner" onReply={(result) => {
        onReply(result);
        setItem({ ...item, customerReplies: [...(item.customerReplies ?? []), result] });
      }} />;
    }
    render(<Thread />);
    openComposer();
    fill();
    send();
    await screen.findByText(reply.content);
    expect(screen.getByText("Khách A")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/trade-posts/post%2F1/reviews/review%2F1/replies");
    expect(options).toMatchObject({
      method: "POST", headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({ content: reply.content }),
    });
    expect(onReply.mock.calls[0][0].author.avatarUrl).toMatch(/^https?:\/\/.*\/uploads\/avatar.jpg$/);
    expect(auth.authenticate).not.toHaveBeenCalled();
  });

  it("shows stored replies to visitors and in the owner's read-only management view", () => {
    auth.user = null;
    auth.accessToken = null;
    render(<TradeReviewCustomerReplies review={{ ...review, customerReplies: [reply] }} readOnly />);
    expect(screen.getByText(reply.content)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("only offers replies on published reviews with an owner response, to non-owners", () => {
    const view = render(<TradeReviewCustomerReplies review={{ ...review, replyContent: null }} ownerId="owner" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    view.rerender(<TradeReviewCustomerReplies review={{ ...review, status: "HIDDEN" }} ownerId="owner" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    auth.user = { id: "owner" };
    view.rerender(<TradeReviewCustomerReplies review={review} ownerId="owner" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not send blank content or submit after canceling", () => {
    render(<TradeReviewCustomerReplies review={review} ownerId="owner" />);
    openComposer();
    fill("   ");
    expect(screen.getByRole("button", { name: "Gửi trả lời" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("1 đến 500");
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the draft and shows server errors, allowing a retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      success: false, error: { code: "REPLY_REMOVED", message: "Phản hồi của chủ tin đã bị xóa." },
    }), { status: 409 }));
    const onReply = vi.fn();
    render(<TradeReviewCustomerReplies review={review} ownerId="owner" onReply={onReply} />);
    openComposer(); fill(); send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Phản hồi của chủ tin đã bị xóa.");
    expect(screen.getByRole("textbox")).toHaveValue("  Cảm ơn chủ tin!  ");
    expect(onReply).not.toHaveBeenCalled();
    send();
    await waitFor(() => expect(onReply).toHaveBeenCalledTimes(1));
  });

  it("authenticates visitors when sending and blocks an owner who just logged in", async () => {
    auth.user = null; auth.accessToken = null;
    auth.authenticate.mockResolvedValue({ user: { id: "owner" }, accessToken: "owner-token" });
    render(<TradeReviewCustomerReplies review={review} ownerId="owner" />);
    openComposer(); fill(); send();
    expect(await screen.findByRole("alert")).toHaveTextContent("phần quản lý tin");
    expect(fetch).not.toHaveBeenCalled();
    auth.authenticate.mockResolvedValue({ user: { id: "customer" }, accessToken: "new-token" });
    send();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer new-token" });
  });

  it("prevents repeated submits while waiting for the server", async () => {
    let resolveRequest!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<TradeReviewCustomerReplies review={review} ownerId="owner" />);
    openComposer(); fill();
    const form = screen.getByRole("textbox").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox")).toBeDisabled();
    await act(async () => resolveRequest(ok()));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
