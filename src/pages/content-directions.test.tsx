import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import TempleDetailPage from "./temple-detail";
import SpecialtyDetailPage from "./specialty-detail";
import HistoricalSiteDetailPage from "./historical-site-detail";
import AgricultureDetailPage from "./agriculture-detail";
import OcopDetailPage from "./ocop-detail";
import CraftVillageDetailPage from "./craft-village-detail";
import CuisineDetailPage from "./CuisineDetailPage";
import FestivalDetailPage from "./festival-detail";
import ExperienceTourDetailPage from "./experience-tour-detail";
import MapPlaceDetailPage from "./map-place-detail";
import ContactDetailPage from "./contact-detail";
import NewsDetailPage from "./news-detail";

const { openOutAppMock } = vi.hoisted(() => ({ openOutAppMock: vi.fn() }));
vi.mock("@/components/content-reviews", () => ({ default: () => null }));
vi.mock("zmp-sdk/apis", () => ({ openOutApp: openOutAppMock, openWebview: vi.fn() }));
vi.mock("zmp-ui", () => ({
  Page: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Icon: () => <span aria-hidden="true" />,
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: "sample" }),
}));

const label = "Chỉ đường bằng Google Maps";
const url = "https://maps.google.com/?q=LocalGo";
const fixture = {
  id: "sample", name: "Sample", title: "Sample", category: "Sample", type: "Chùa",
  description: [], history: [], events: [], highlights: [], buyPlaces: [], products: [],
  activities: [], experiences: [], itinerary: [], included: [], supportTopics: [],
  content: [], tags: [], relatedLinks: [], suggestedPlaces: ["Legacy place"],
  phone: "0123456789", publishedAt: "2026-10-20T00:00:00Z",
  coordinates: { lat: 11, lng: 106 }, imageUrl: null,
};

function mockApi(data: object) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data }),
  }));
}

beforeEach(() => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 13) Zalo/24.10");
  openOutAppMock.mockReset();
  openOutAppMock.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const pages = [
  { name: "temple", Component: TempleDetailPage },
  { name: "specialty", Component: SpecialtyDetailPage },
  { name: "historical-site", Component: HistoricalSiteDetailPage },
  { name: "agriculture", Component: AgricultureDetailPage },
  { name: "ocop", Component: OcopDetailPage },
  { name: "craft-village", Component: CraftVillageDetailPage },
  { name: "cuisine", Component: CuisineDetailPage },
  { name: "festival", Component: FestivalDetailPage },
  { name: "experience-tour", Component: ExperienceTourDetailPage },
  { name: "map-place", Component: MapPlaceDetailPage },
  { name: "contact", Component: ContactDetailPage },
  { name: "news", Component: NewsDetailPage },
];

describe.each(pages)("$name detail Google Maps (API to UI)", ({ Component }) => {
  it("reads and opens the URL supplied by the API", async () => {
    mockApi({ ...fixture, googleMapsUrl: url });
    render(<Component />);
    const button = await screen.findByRole("button", { name: label });
    await userEvent.setup().click(button);
    expect(openOutAppMock).toHaveBeenCalledWith({ url });
  });

  it.each([undefined, "", "http://maps.google.com/", "https://example.com/maps"])(
    "hides the CTA for missing/invalid API URL %s", async (googleMapsUrl) => {
      mockApi({ ...fixture, googleMapsUrl });
      render(<Component />);
      await screen.findByRole("heading", { name: "Sample", level: 1 });
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
      expect(openOutAppMock).not.toHaveBeenCalled();
    }
  );
});

describe("Cuisine dish and suggested place URLs", () => {
  it("keeps the main URL and each place URL independent", async () => {
    const placeUrl = "https://maps.app.goo.gl/placeA";
    const placeUrlB = "https://goo.gl/maps/placeB";
    mockApi({ ...fixture, googleMapsUrl: url, suggestedPlaceDetails: [
      { id: "a", name: "Place A", address: "Address A", googleMapsUrl: placeUrl },
      { id: "b", name: "Place B", address: "Address B", googleMapsUrl: placeUrlB },
      { id: "c", name: "Place C", address: "", googleMapsUrl: "https://example.com" },
    ] });
    render(<CuisineDetailPage />);
    const buttons = await screen.findAllByRole("button", { name: label });
    expect(buttons).toHaveLength(3);
    const user = userEvent.setup();
    for (const button of buttons) await user.click(button);
    expect(openOutAppMock.mock.calls.map(([args]) => args.url)).toEqual([url, placeUrl, placeUrlB]);
    expect(screen.getByText("Address A")).toBeInTheDocument();
    expect(screen.queryByText("Legacy place")).not.toBeInTheDocument();
    const invalidPlace = screen.getByText("Place C").closest("li")!;
    expect(within(invalidPlace).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a place CTA even without a dish URL", async () => {
    mockApi({ ...fixture, suggestedPlaceDetails: [
      { id: "a", name: "Place A", address: "", googleMapsUrl: url },
    ] });
    render(<CuisineDetailPage />);
    expect(await screen.findAllByRole("button", { name: label })).toHaveLength(1);
    expect(screen.getByText("Place A")).toBeInTheDocument();
  });

  it("preserves legacy place names without assigning them the dish URL", async () => {
    mockApi({ ...fixture, googleMapsUrl: url });
    render(<CuisineDetailPage />);
    expect(await screen.findAllByRole("button", { name: label })).toHaveLength(1);
    const legacyPlace = screen.getByText("Legacy place").closest("li")!;
    expect(within(legacyPlace).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Specialty buy place details", () => {
  it("shows each structured place with its own map and real contact actions", async () => {
    const placeUrl = "https://maps.app.goo.gl/specialtyPlace";
    mockApi({
      ...fixture,
      googleMapsUrl: undefined,
      buyPlaces: ["Legacy place"],
      buyPlaceDetails: [
        {
          id: "cho-truong-mit",
          name: "Chợ Truông Mít",
          address: "Trung tâm xã",
          googleMapsUrl: placeUrl,
          phone: "0900 123 456",
          email: "lienhe@example.com",
        },
        {
          id: "no-contact",
          name: "Điểm chưa có liên hệ",
          address: "Ấp Thuận Bình",
          googleMapsUrl: "https://example.com/not-maps",
          phone: "",
          email: null,
        },
      ],
    });

    render(<SpecialtyDetailPage />);

    expect(await screen.findByText("Chợ Truông Mít")).toBeInTheDocument();
    expect(screen.getByText("Trung tâm xã")).toBeInTheDocument();
    expect(screen.queryByText("Legacy place")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gọi điện" })).toHaveAttribute(
      "href",
      "tel:0900123456"
    );
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:lienhe@example.com"
    );

    const mapButton = screen.getByRole("button", { name: "Xem bản đồ" });
    await userEvent.setup().click(mapButton);
    expect(openOutAppMock).toHaveBeenCalledWith({ url: placeUrl });

    const noContactPlace = screen.getByText("Điểm chưa có liên hệ").closest("li")!;
    expect(within(noContactPlace).queryByRole("button")).not.toBeInTheDocument();
    expect(within(noContactPlace).queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps legacy place names without inventing maps or contact details", async () => {
    mockApi({ ...fixture, googleMapsUrl: url, buyPlaces: ["Chợ cũ"] });
    render(<SpecialtyDetailPage />);

    const legacyPlace = (await screen.findByText("Chợ cũ")).closest("li")!;
    expect(within(legacyPlace).queryByRole("button")).not.toBeInTheDocument();
    expect(within(legacyPlace).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: label })).toHaveLength(1);
  });
});
