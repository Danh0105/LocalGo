import type { ReactNode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TradeCreatePage from "./trade-create";
import TradeEditPage from "./trade-edit";
import {
  formatTradePostPrice,
  getTradePostPurpose,
} from "@/lib/trade-post-presentation";

const mocks = vi.hoisted(() => ({
  businessType: "TEMPLE_MANAGEMENT",
  createTradePost: vi.fn(),
  updateTradePost: vi.fn(),
  getMyTradePostDetail: vi.fn(),
  refreshUser: vi.fn(),
  categories: [
    {
      id: "cat",
      code: "COMMUNITY",
      name: "Hoạt động cộng đồng",
      requiresPromotionDetails: false,
    },
  ],
}));
vi.mock("zmp-ui", () => ({
  Page: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: "post" }),
  useLocation: () => ({ state: null }),
}));
vi.mock("@/components/trade-access-dialogs", () => ({
  BusinessProfileRequiredDialog: () => null,
  TradeLoginRequiredDialog: () => null,
}));
vi.mock("@/contexts/auth-context", () => ({
  useCurrentUser: () => ({
    user: {
      id: "user",
      role: "BUSINESS",
      status: "ACTIVE",
      businessType: mocks.businessType,
    },
    accessToken: "token",
    status: "authenticated",
    authenticate: vi.fn(),
    refreshUser: mocks.refreshUser,
  }),
}));
vi.mock("@/hooks/use-trade-post-categories", () => ({
  useTradePostCategories: () => ({
    categories: mocks.categories,
    isLoading: false,
    error: "",
    reload: vi.fn(),
  }),
}));
vi.mock("@/services/trade-posts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/trade-posts")>()),
  createTradePost: mocks.createTradePost,
  updateTradePost: mocks.updateTradePost,
  getMyTradePostDetail: mocks.getMyTradePostDetail,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.businessType = "TEMPLE_MANAGEMENT";
  mocks.refreshUser.mockResolvedValue({ businessType: "TEMPLE_MANAGEMENT" });
  mocks.createTradePost.mockResolvedValue({
    id: "post",
    title: "Hoạt động cộng đồng",
    status: "DRAFT",
  });
  mocks.updateTradePost.mockResolvedValue({ id: "post" });
  mocks.getMyTradePostDetail.mockResolvedValue({
    id: "post",
    title: "Lễ hội",
    summary: "Hoạt động cộng đồng",
    description: "Nội dung hoạt động",
    category: "COMMUNITY",
    purpose: "NON_PROFIT",
    priceType: "FIXED",
    price: "100",
    priceLabel: "Giá cũ",
    address: "Truông Mít",
    contactName: "Ban quản lý",
    contactPhone: "0900123456",
    status: "DRAFT",
    expiresAt: null,
    eventEndAt: "2030-10-21T10:00:00Z",
  });
});
afterEach(cleanup);

function fillFields(container: HTMLElement) {
  for (const [name, value] of Object.entries({
    title: "Hoạt động cộng đồng",
    summary: "Thông tin sự kiện",
    description: "Mời tham gia hoạt động địa phương",
    address: "Truông Mít",
    contactName: "Ban quản lý",
    contactPhone: "0900123456",
  })) {
    fireEvent.change(container.querySelector(`[name="${name}"]`)!, {
      target: { value },
    });
  }
}

describe("non-profit trade posts", () => {
  it("forces the approved temple business type to NON_PROFIT and prioritizes the purpose over stale price fields", () => {
    expect(getTradePostPurpose("TEMPLE_MANAGEMENT", "COMMERCIAL")).toBe(
      "NON_PROFIT",
    );
    expect(getTradePostPurpose("GARDEN")).toBe("COMMERCIAL");
    expect(
      formatTradePostPrice({
        purpose: "NON_PROFIT",
        priceType: "FIXED",
        price: "100000",
        priceLabel: "Giá cũ",
      }),
    ).toBe("Phi lợi nhuận");
  });

  it("creates a temple post without price or explicit expiry, preserving the event end for backend expiry", async () => {
    const view = render(<TradeCreatePage />);
    await screen.findByText("Tin phi lợi nhuận");
    expect(view.container.querySelector('[name="priceType"]')).toBeNull();
    fillFields(view.container);
    fireEvent.change(view.container.querySelector('[name="eventEndAt"]')!, {
      target: { value: "2030-10-21T17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() => expect(mocks.createTradePost).toHaveBeenCalled());
    const payload = mocks.createTradePost.mock.calls[0][1];
    expect(payload).toMatchObject({
      purpose: "NON_PROFIT",
      eventEndAt: new Date("2030-10-21T17:00").toISOString(),
    });
    for (const key of ["priceType", "price", "priceLabel", "expiresAt"])
      expect(payload).not.toHaveProperty(key);
  });

  it("preserves non-profit purpose on edit, allows clearing the event and never submits old prices", async () => {
    const view = render(<TradeEditPage />);
    await screen.findByText("Tin phi lợi nhuận");
    expect(view.container.querySelector('[name="price"]')).toBeNull();
    fireEvent.change(view.container.querySelector('[name="eventEndAt"]')!, {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(mocks.updateTradePost).toHaveBeenCalled());
    const payload = mocks.updateTradePost.mock.calls[0][2];
    expect(payload).toMatchObject({
      purpose: "NON_PROFIT",
      eventEndAt: null,
      expiresAt: null,
    });
    for (const key of ["priceType", "price", "priceLabel"])
      expect(payload).not.toHaveProperty(key);
  });

  it("keeps the existing commercial pricing flow for garden businesses", async () => {
    mocks.businessType = "GARDEN";
    const view = render(<TradeCreatePage />);
    await screen.findByRole("button", { name: "Lưu nháp" });
    fillFields(view.container);
    expect(view.container.querySelector('[name="priceType"]')).not.toBeNull();
    expect(view.container.querySelector('[name="eventEndAt"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
    await waitFor(() => expect(mocks.createTradePost).toHaveBeenCalled());
    expect(mocks.createTradePost.mock.calls[0][1]).toMatchObject({
      purpose: "COMMERCIAL",
      priceType: "CONTACT",
    });
  });
});
