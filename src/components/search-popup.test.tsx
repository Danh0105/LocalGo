import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchPopup from "./search-popup";

const { navigate, searchAll } = vi.hoisted(() => ({
  navigate: vi.fn(),
  searchAll: vi.fn(),
}));
vi.mock("zmp-ui", () => ({ Icon: () => null, useNavigate: () => navigate }));
vi.mock("@/services/search", () => ({ searchAll }));
const result = {
  resourceType: "OCOP",
  resourceLabel: "OCOP",
  id: "id",
  slug: null,
  title: "Mãng cầu",
  summary: "Đặc sản địa phương",
  imageUrl: null,
};
const response = (page = 1) => ({
  items: [
    page === 1 ? result : { ...result, id: "second", title: "Mãng cầu sấy" },
  ],
  meta: { page, limit: 30, total: 2, totalPages: 2 },
});

beforeEach(() => {
  vi.clearAllMocks();
  searchAll.mockResolvedValue(response());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("search popup", () => {
  it("waits for two characters and debounces the public request", async () => {
    vi.useFakeTimers();
    render(<SearchPopup open onClose={() => undefined} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "a" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(searchAll).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "ma" } });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.change(input, { target: { value: "mãng cầu" } });
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(searchAll).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(searchAll).toHaveBeenCalledTimes(1);
    expect(searchAll.mock.calls[0][0]).toBe("mãng cầu");
  });

  it("aborts a previous request and ignores a late response", async () => {
    vi.useFakeTimers();
    let resolveOld: (value: ReturnType<typeof response>) => void = () =>
      undefined;
    searchAll.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    render(<SearchPopup open onClose={() => undefined} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "chùa" },
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    const signal = searchAll.mock.calls[0][1].signal as AbortSignal;
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "tour" },
    });
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolveOld(response());
    });
    expect(screen.queryByText("Mãng cầu")).not.toBeInTheDocument();
  });

  it("keeps earlier results on pagination failure, retries and routes OCOP by ID", async () => {
    searchAll
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error("Mất kết nối"))
      .mockResolvedValueOnce(response(2));
    const close = vi.fn();
    render(<SearchPopup open onClose={close} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "mãng cầu" },
    });
    await screen.findByText("Mãng cầu");
    fireEvent.click(screen.getByRole("button", { name: "Xem thêm kết quả" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Mãng cầu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Mãng cầu sấy");
    fireEvent.click(screen.getByRole("button", { name: /Mãng cầu Đặc sản/ }));
    expect(navigate).toHaveBeenCalledWith("/ocop/id");
    expect(close).toHaveBeenCalled();
  });

  it("shows a retryable initial error and restores focus on close", async () => {
    searchAll
      .mockRejectedValueOnce(new Error("Không thể kết nối"))
      .mockResolvedValueOnce(response());
    const close = vi.fn();
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const view = render(<SearchPopup open onClose={close} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "mãng cầu" },
    });
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Mãng cầu");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalled();
    view.unmount();
    await waitFor(() => expect(document.activeElement).toBe(opener));
    opener.remove();
  });
});
