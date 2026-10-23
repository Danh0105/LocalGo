import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TemplesPage from "./temples";
import HistoricalSitesPage from "./historical-sites";
import { getTemples, type TempleListItem } from "@/services/temples";
import { getHistoricalSites } from "@/services/historical-sites";
import { mergeHeritagePlaces } from "@/services/heritage-directory";
import type { HistoricalSite } from "@/data/historical-sites";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("zmp-ui", () => ({
  Icon: () => null,
  Page: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useNavigate: () => navigate,
}));
vi.mock("@/services/temples", () => ({ getTemples: vi.fn() }));
vi.mock("@/services/historical-sites", () => ({ getHistoricalSites: vi.fn() }));
vi.mock("@/hooks/use-content-ratings", () => ({ useContentRatings: () => ({}) }));
vi.mock("@/components/trade/section-trade-posts", () => ({ default: () => null }));

const temple: TempleListItem = {
  id: "same/id", name: "Chùa A", type: "Chùa", address: "Đường A",
  summary: "Giới thiệu chùa", imageUrl: null, imageAlt: "Chùa A",
  openHours: "Cả ngày", sortOrder: 0, updatedAt: "2026-10-21T00:00:00Z",
};
const site: HistoricalSite = {
  id: "same/id", name: "Địa đạo B", rank: "Cấp tỉnh", address: "Đường B",
  summary: "Giới thiệu di tích", image: "history.jpg", history: [], highlights: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTemples).mockResolvedValue([temple]);
  vi.mocked(getHistoricalSites).mockResolvedValue([site]);
});
afterEach(cleanup);

describe("merged heritage identities", () => {
  it("keeps distinct sources separate even when their database IDs match", () => {
    const result = mergeHeritagePlaces([temple], [site]);
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.sources[0].detailPath)).toEqual([
      "/temples/same%2Fid", "/historical-sites/same%2Fid",
    ]);
  });

  it("merges shared Maps URLs, retaining both detail routes and filter tags", () => {
    const url = "https://maps.app.goo.gl/shared";
    const result = mergeHeritagePlaces([{ ...temple, googleMapsUrl: url }], [{ ...site, googleMapsUrl: ` ${url} ` }]);
    expect(result).toHaveLength(1);
    expect(result[0].tags).toEqual(["Chùa", "Di tích lịch sử", "Cấp tỉnh"]);
    expect(result[0].sources).toHaveLength(2);
  });

  it("merges matching names and nonempty addresses while preserving accents", () => {
    expect(mergeHeritagePlaces([temple], [{ ...site, name: " CHÙA  A ", address: " đường a " }])).toHaveLength(1);
    expect(mergeHeritagePlaces([{ ...temple, address: "" }], [{ ...site, name: temple.name, address: "" }])).toHaveLength(2);
    expect(mergeHeritagePlaces([temple], [{ ...site, name: "Chua A", address: temple.address }])).toHaveLength(2);
  });
});

describe.each([
  { name: "temples", Page: TemplesPage },
  { name: "historical sites", Page: HistoricalSitesPage },
])("$name shared list", ({ Page }) => {
  it("loads both sources and filters locally with correct detail navigation", async () => {
    render(<Page />);
    await screen.findByRole("heading", { name: temple.name });
    expect(screen.getByRole("heading", { name: site.name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Di tích lịch sử" }));
    expect(screen.queryByRole("heading", { name: temple.name })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("heading", { name: site.name }));
    expect(navigate).toHaveBeenLastCalledWith("/historical-sites/same%2Fid");
    fireEvent.click(screen.getByRole("button", { name: "Chùa" }));
    expect(screen.queryByRole("heading", { name: site.name })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("heading", { name: temple.name }));
    expect(navigate).toHaveBeenLastCalledWith("/temples/same%2Fid");
    expect(getTemples).toHaveBeenCalledTimes(1);
    expect(getHistoricalSites).toHaveBeenCalledTimes(1);
  });
});

it("keeps available places during partial failure and retries the missing source", async () => {
  vi.mocked(getHistoricalSites).mockRejectedValueOnce(new Error("OFFLINE"));
  render(<TemplesPage />);
  await screen.findByRole("heading", { name: temple.name });
  expect(screen.getByRole("alert")).toHaveTextContent("Chưa tải được: Di tích lịch sử");
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await screen.findByRole("heading", { name: site.name });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("shows one card for a duplicate, with access to both source profiles", async () => {
  vi.mocked(getHistoricalSites).mockResolvedValue([{ ...site, name: temple.name, address: temple.address }]);
  render(<TemplesPage />);
  await screen.findByRole("heading", { name: temple.name });
  expect(screen.getAllByRole("heading", { name: temple.name })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: `Xem hồ sơ di tích lịch sử: ${temple.name}` }));
  expect(navigate).toHaveBeenCalledWith("/historical-sites/same%2Fid");
  fireEvent.click(screen.getByRole("button", { name: "Cấp tỉnh" }));
  expect(screen.getByRole("heading", { name: temple.name })).toBeInTheDocument();
});

it("shows a retryable error when both sources fail and recovers", async () => {
  vi.mocked(getTemples).mockRejectedValueOnce(new Error("OFFLINE"));
  vi.mocked(getHistoricalSites).mockRejectedValueOnce(new Error("OFFLINE"));
  render(<TemplesPage />);
  await screen.findByRole("alert");
  expect(screen.queryByText("Chưa có địa điểm trong nhóm này.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: site.name })).toBeInTheDocument());
});
