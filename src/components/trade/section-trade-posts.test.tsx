import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SectionTradePosts from "./section-trade-posts";
import type { TradePostResponse } from "@/services/trade-posts";

const { getTradePosts, navigate } = vi.hoisted(() => ({
  getTradePosts: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("zmp-ui", () => ({ useNavigate: () => navigate, useLocation: () => ({ pathname: "/agriculture" }) }));
vi.mock("@/hooks/use-trade-post-categories", () => ({
  useTradePostCategories: () => ({
    categories: [
      { id: "product", code: "PRODUCT", name: "Sản phẩm" },
      { id: "service", code: "SERVICE", name: "Dịch vụ" },
    ],
    isLoading: false,
    error: "",
    isFallback: false,
    reload: vi.fn(),
  }),
}));
vi.mock("@/services/trade-posts", () => ({
  getTradePosts,
  getTradePostCategoryName: (_: string, info?: { name: string }) =>
    info?.name || "Sản phẩm",
}));
const post = {
  id: "one",
  slug: "tin-nha-vuon",
  title: "Sản vật mới thu hoạch",
  summary: "Tin do backend lựa chọn",
  category: "OTHER",
  purpose: "NON_PROFIT",
  priceType: "CONTACT",
  price: null,
  priceLabel: "Không hiển thị nhãn này",
  thumbnailUrl: null,
  images: [],
  contactName: "Chủ vườn",
  address: "Truông Mít",
} as unknown as TradePostResponse;
const page = (items: TradePostResponse[], number = 1, totalPages = 1) => ({
  items,
  meta: { page: number, limit: 10, total: items.length, totalPages },
});
beforeEach(() => {
  vi.clearAllMocks();
  getTradePosts.mockResolvedValue(page([post]));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("section trade feed", () => {
  it("applies combined category and price filters, retains them on pagination and clears them", async () => {
    getTradePosts.mockResolvedValue(page([post], 1, 2));
    render(<SectionTradePosts section="agriculture" />);
    await screen.findByText(post.title);
    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc giao thương" }));
    const dialog = screen.getByRole("dialog", { name: "Bộ lọc giao thương" });
    fireEvent.click(within(dialog).getByRole("radio", { name: "Sản phẩm" }));
    fireEvent.change(within(dialog).getByLabelText("Từ (VNĐ)"), {
      target: { value: "100000" },
    });
    fireEvent.change(within(dialog).getByLabelText("Đến (VNĐ)"), {
      target: { value: "500000" },
    });
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Áp dụng bộ lọc" }),
    );
    await waitFor(() =>
      expect(getTradePosts.mock.lastCall?.[0]).toMatchObject({
        section: "agriculture",
        category: "PRODUCT",
        minPrice: 100000,
        maxPrice: 500000,
        featured: true,
        page: 1,
      }),
    );
    await screen.findByText(post.title);
    fireEvent.click(screen.getByRole("button", { name: "Xem thêm tin" }));
    await waitFor(() =>
      expect(getTradePosts.mock.lastCall?.[0]).toMatchObject({
        category: "PRODUCT",
        minPrice: 100000,
        maxPrice: 500000,
        featured: true,
        page: 2,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    await waitFor(() =>
      expect(getTradePosts.mock.lastCall?.[0]).toMatchObject({
        section: "agriculture",
        category: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        page: 1,
      }),
    );
    expect(getTradePosts.mock.lastCall?.[0].featured).toBeUndefined();
  });

  it("validates the price range without applying invalid values and cancels draft filters", async () => {
    render(<SectionTradePosts section="cuisine" />);
    await screen.findByText(post.title);
    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc giao thương" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Từ (VNĐ)"), {
      target: { value: "500000" },
    });
    fireEvent.change(within(dialog).getByLabelText("Đến (VNĐ)"), {
      target: { value: "100000" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Áp dụng bộ lọc" }),
    );
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "khoảng giá hợp lệ",
    );
    expect(getTradePosts).toHaveBeenCalledTimes(1);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Đóng bộ lọc" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getTradePosts).toHaveBeenCalledTimes(1);
  });

  it("does not offer commercial price filters for temple posts", async () => {
    render(<SectionTradePosts section="temples" />);
    await screen.findByText(post.title);
    fireEvent.click(screen.getByRole("button", { name: "Bộ lọc giao thương" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText("Từ (VNĐ)")).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(/không áp dụng bộ lọc giá/),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Dịch vụ" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Áp dụng bộ lọc" }),
    );
    await waitFor(() =>
      expect(getTradePosts.mock.lastCall?.[0]).toMatchObject({
        section: "temples",
        category: "SERVICE",
      }),
    );
    expect(getTradePosts.mock.lastCall?.[0]).not.toHaveProperty("minPrice");
  });
  it("renders the backend selection without filtering by category, title or business type", async () => {
    render(<SectionTradePosts section="cuisine" />);
    expect(await screen.findByText(post.title)).toBeInTheDocument();
    expect(getTradePosts.mock.calls[0][0]).toMatchObject({
      section: "cuisine",
      limit: 10,
    });
    expect(screen.getByText("Phi lợi nhuận")).toBeInTheDocument();
    expect(screen.queryByText(post.priceLabel!)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Sản vật mới thu hoạch/ }),
    );
    expect(navigate).toHaveBeenCalledWith("/trade/tin-nha-vuon");
  });

  it("retains previous items after a load-more failure and retries the same next page", async () => {
    getTradePosts
      .mockResolvedValueOnce(page([post], 1, 2))
      .mockRejectedValueOnce(new Error("Mất kết nối"))
      .mockResolvedValueOnce(
        page([{ ...post, id: "two", title: "Tin thứ hai" }], 2, 2),
      );
    render(<SectionTradePosts section="agriculture" />);
    await screen.findByText(post.title);
    fireEvent.click(screen.getByRole("button", { name: "Xem thêm tin" }));
    await screen.findByRole("alert");
    expect(screen.getByText(post.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Tin thứ hai");
    expect(
      getTradePosts.mock.calls.slice(1).map((call) => call[0].page),
    ).toEqual([2, 2]);
  });

  it("keeps the section query when changing sort order and featured filter", async () => {
    render(<SectionTradePosts section="specialties" />);
    await screen.findByText(post.title);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "price_asc" },
    });
    await waitFor(() =>
      expect(getTradePosts.mock.lastCall?.[0]).toMatchObject({
        section: "specialties",
        sortBy: "price_asc",
        page: 1,
      }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Tin nổi bật" }));
    await waitFor(() =>
      expect(getTradePosts.mock.lastCall?.[0]).toMatchObject({
        section: "specialties",
        featured: true,
        sortBy: "price_asc",
      }),
    );
  });

  it("debounces search and aborts the old request on section changes", async () => {
    vi.useFakeTimers();
    const view = render(<SectionTradePosts section="specialties" />);
    await act(async () => undefined);
    const oldSignal = getTradePosts.mock.calls[0][1] as AbortSignal;
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "bưởi" },
    });
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(getTradePosts).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(oldSignal.aborted).toBe(true);
    expect(getTradePosts.mock.lastCall?.[0]).toMatchObject({
      section: "specialties",
      search: "bưởi",
    });
    const searchSignal = getTradePosts.mock.lastCall?.[1] as AbortSignal;
    view.rerender(<SectionTradePosts section="temples" />);
    await act(async () => undefined);
    expect(searchSignal.aborted).toBe(true);
    expect(getTradePosts.mock.lastCall?.[0]).toMatchObject({
      section: "temples",
    });
    expect(
      screen.queryByRole("option", { name: "Giá thấp đến cao" }),
    ).not.toBeInTheDocument();
  });
});
