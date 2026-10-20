import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import MapPlacesPage from "./map-places";
import { getMapDirectory } from "@/services/map-directory";
import type { DirectoryPlace } from "@/services/map-directory";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("zmp-ui", () => ({ Page: ({ children }: { children: ReactNode }) => <div>{children}</div>, Icon: () => <span />, useNavigate: () => navigate }));
vi.mock("@/components/directory-map", () => ({ default: () => <div>Bản đồ</div> }));
vi.mock("@/components/directions-button", () => ({ default: ({ googleMapsUrl }: { googleMapsUrl: string }) => <a href={googleMapsUrl}>Chỉ đường</a> }));
vi.mock("@/services/map-directory", () => ({ getMapDirectory: vi.fn() }));
const places: DirectoryPlace[] = [
  { id: "food:a", name: "Quán Bánh Canh", categories: ["Ăn uống"], address: "Đường A", summary: "", image: "", googleMapsUrl: "https://maps.app.goo.gl/a", detailPath: "/cuisine/a" },
  { id: "temple:a", name: "Miếu Bà", categories: ["Đền miếu"], address: "Đường B", summary: "", image: "", googleMapsUrl: "https://maps.app.goo.gl/b", detailPath: "/temples/a" },
];
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("map directory page", () => {
  it("shows linked places, searches without accents, filters locally and navigates to the source", async () => {
    vi.mocked(getMapDirectory).mockResolvedValue({ places, failedSources: [] });
    const user = userEvent.setup();
    render(<MapPlacesPage />);
    await screen.findByRole("heading", { name: "Quán Bánh Canh" });
    expect(screen.getAllByRole("link", { name: "Chỉ đường" })).toHaveLength(2);
    await user.type(screen.getByRole("searchbox"), "mieu ba");
    expect(screen.getByRole("heading", { name: "Miếu Bà" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Quán Bánh Canh" })).not.toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox"));
    await user.click(screen.getByRole("button", { name: "Ăn uống 1" }));
    expect(screen.queryByRole("heading", { name: "Miếu Bà" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Chi tiết" }));
    expect(navigate).toHaveBeenCalledWith("/cuisine/a");
    expect(getMapDirectory).toHaveBeenCalledTimes(1);
  });

  it("shows partial failure with retry and preserves available places", async () => {
    vi.mocked(getMapDirectory).mockResolvedValue({ places, failedSources: ["Du lịch"] });
    render(<MapPlacesPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa tải được: Du lịch");
    expect(screen.getByRole("heading", { name: "Miếu Bà" })).toBeInTheDocument();
    await userEvent.setup().click(within(screen.getByRole("alert")).getByRole("button", { name: "Thử lại" }));
    expect(getMapDirectory).toHaveBeenCalledTimes(2);
  });
});
