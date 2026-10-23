import type { ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AgriculturePage from "./agriculture";
import CuisinePage from "./cuisine";
import TemplesPage from "./temples";
import SpecialtiesPage from "./specialties";

vi.mock("zmp-ui", () => ({
  Icon: () => null,
  Page: ({
    children,
    className,
  }: {
    children: ReactNode;
    className: string;
  }) => <div className={className}>{children}</div>,
  useNavigate: () => vi.fn(),
}));
vi.mock("@/services/agriculture", () => ({
  getAgricultureItems: async () => [],
}));
vi.mock("@/services/cuisine", () => ({ getCuisineItems: async () => [] }));
vi.mock("@/services/temples", () => ({ getTemples: async () => [] }));
vi.mock("@/services/historical-sites", () => ({ getHistoricalSites: async () => [] }));
vi.mock("@/services/specialties", () => ({ getSpecialties: async () => [] }));
vi.mock("@/hooks/use-content-ratings", () => ({
  useContentRatings: () => ({}),
}));
vi.mock("@/components/trade/section-trade-posts", () => ({
  default: ({ section }: { section: string }) => (
    <div data-testid="market">{section}</div>
  ),
}));
afterEach(cleanup);

describe.each([
  { name: "agriculture", Page: AgriculturePage },
  { name: "cuisine", Page: CuisinePage },
  { name: "temples", Page: TemplesPage },
  { name: "specialties", Page: SpecialtiesPage },
])("$name content sources", ({ Page }) => {
  it("switches between all content, editorial content and trade posts", async () => {
    const view = render(<Page />);
    await act(async () => undefined);
    const tabs = screen.getByRole("group", { name: "Nguồn nội dung" });
    const editorial = view.container.querySelector(
      ".section-directory__editorial",
    );
    expect(editorial).toBeVisible();
    expect(screen.getByTestId("market")).toBeVisible();
    fireEvent.click(within(tabs).getByRole("button", { name: "Giao thương" }));
    expect(editorial).not.toBeVisible();
    expect(screen.getByTestId("market")).toBeVisible();
    fireEvent.click(within(tabs).getByRole("button", { name: "Khám phá" }));
    expect(editorial).toBeVisible();
    expect(screen.getByTestId("market")).not.toBeVisible();
    fireEvent.click(within(tabs).getByRole("button", { name: "Tất cả" }));
    expect(editorial).toBeVisible();
    expect(screen.getByTestId("market")).toBeVisible();
  });
});
