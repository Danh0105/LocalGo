import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TradePage from "./trade";
import TradeDetailPage from "./trade-detail";
import { TradeSaveProvider, useTradeSaves } from "@/contexts/trade-save-context";
import { getSavedTradePosts, getTradePosts } from "@/services/trade-posts";
import { getSearchResultPath } from "@/lib/search-routes";
import type { SearchResult } from "@/types/search";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(), authenticate: vi.fn(), snackbar: vi.fn(),
  pathname: "/trade", slug: "", status: 404,
}));
vi.mock("zmp-ui", () => ({
  Page: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  Modal: ({ visible, children }: { visible: boolean; children: ReactNode }) => visible ? <div>{children}</div> : null,
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: mocks.slug }),
  useLocation: () => ({ pathname: mocks.pathname, state: null }),
  useSnackbar: () => ({ openSnackbar: mocks.snackbar }),
}));
vi.mock("@/contexts/auth-context", () => ({
  useCurrentUser: () => ({
    user: null, accessToken: null, status: "anonymous", authenticate: mocks.authenticate,
  }),
}));
vi.mock("@/components/notification-bell", () => ({ default: () => null }));
const reloadCategories = vi.fn();
vi.mock("@/hooks/use-trade-post-categories", () => ({
  useTradePostCategories: () => ({
    categories: [], isLoading: false, error: "", reload: reloadCategories,
  }),
}));

let sequence = 0;
const post = () => ({
  id: "database-id", slug: mocks.slug, title: "Tiêu đề khác hoàn toàn slug",
  category: "PRODUCT", purpose: "COMMERCIAL", priceType: "CONTACT",
  images: [], isSaved: true, saveCount: 5, reviewCount: 0, viewCount: 0,
});
const response = (data: unknown) => new Response(JSON.stringify({
  success: true, data, meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
}));

function SaveProbe() {
  const { getSaveState } = useTradeSaves();
  return <output data-testid="saved-cache">{String(getSaveState({ id: "database-id", isSaved: false, saveCount: 0 }).isSaved)}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/trade";
  mocks.slug = `api-slug-${++sequence}/vườn & trái`;
  mocks.status = 404;
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/trade-posts") || url.pathname.endsWith("/me/saved")) return response([post()]);
    return new Response(JSON.stringify({
      success: false, error: { code: "RESOURCE_NOT_FOUND", message: "Không tìm thấy tin đăng" },
    }), { status: mocks.status });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("public trade lifecycle", () => {
  it("uses the API slug for both mouse and keyboard navigation without requesting login", async () => {
    const result = await getTradePosts();
    expect(result.items[0].slug).toBe(mocks.slug);
    render(<TradeSaveProvider><TradePage /></TradeSaveProvider>);
    const title = await screen.findByText(post().title);
    const card = title.closest("article")!;
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: "Enter" });
    expect(mocks.navigate).toHaveBeenNthCalledWith(1, `/trade/${encodeURIComponent(mocks.slug)}`);
    expect(mocks.navigate).toHaveBeenNthCalledWith(2, `/trade/${encodeURIComponent(mocks.slug)}`);
    expect(mocks.authenticate).not.toHaveBeenCalled();
    for (const [, options] of vi.mocked(fetch).mock.calls) expect(options?.headers).toBeUndefined();
  });

  it("renders a friendly 404, evicts retained list/save state and rejects stale list responses on return", async () => {
    const tree = (detail = false) => <TradeSaveProvider>
      <TradePage /><SaveProbe />{detail && <TradeDetailPage />}
    </TradeSaveProvider>;
    const view = render(tree());
    await screen.findByText(post().title);
    expect(screen.getByTestId("saved-cache")).toHaveTextContent("true");
    mocks.pathname = `/trade/${encodeURIComponent(mocks.slug)}`;
    view.rerender(tree(true));
    await screen.findByText("Tin đăng không còn tồn tại hoặc đã được gỡ.");
    await waitFor(() => expect(screen.queryByText(post().title)).not.toBeInTheDocument());
    expect(screen.getByTestId("saved-cache")).toHaveTextContent("false");
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
    expect(await getTradePosts()).toMatchObject({ items: [] });
    expect(await getSavedTradePosts("test-only-placeholder")).toMatchObject({ items: [] });
    const detailCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith(encodeURIComponent(mocks.slug)));
    expect(detailCalls()).toHaveLength(1);
    expect(String(detailCalls()[0][0])).toContain(`/trade-posts/${encodeURIComponent(mocks.slug)}`);
    fireEvent.click(screen.getByRole("button", { name: "Quay lại danh sách" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/trade", { replace: true });
    mocks.pathname = "/trade";
    await act(async () => view.rerender(tree()));
    await screen.findByText("Chưa tìm thấy kết quả");
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.navigate.mock.calls.every(([path]) => path === "/trade")).toBe(true);
  });

  it("keeps public 401 as a retryable error without logging in", async () => {
    mocks.status = 401;
    render(<TradeSaveProvider><TradeDetailPage /></TradeSaveProvider>);
    await screen.findByText("Không tìm thấy tin đăng");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("uses only API slugs in trade search links", () => {
    const item = { resourceType: "TRADE_POST", id: "database-id", slug: mocks.slug, title: "Other title" } as SearchResult;
    expect(getSearchResultPath(item)).toBe(`/trade/${encodeURIComponent(mocks.slug)}`);
    expect(getSearchResultPath({ ...item, slug: null })).toBe("/trade");
  });
});
