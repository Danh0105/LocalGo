import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DirectionsButton from "./directions-button";

const { openOutAppMock } = vi.hoisted(() => ({
  openOutAppMock: vi.fn(),
}));

vi.mock("zmp-sdk/apis", () => ({
  openOutApp: openOutAppMock,
}));

describe("DirectionsButton", () => {
  beforeEach(() => {
    openOutAppMock.mockReset();
    openOutAppMock.mockResolvedValue(undefined);
  });

  it("renders nothing when the URL is missing", () => {
    const { container } = render(<DirectionsButton googleMapsUrl={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the URL is not a valid Google Maps link", () => {
    const { container } = render(
      <DirectionsButton googleMapsUrl="https://example.com/not-maps" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the CTA when the URL is a valid Google Maps link", () => {
    render(<DirectionsButton googleMapsUrl="https://maps.google.com/?q=Den+Ba" />);
    expect(
      screen.getByRole("button", { name: "Chỉ đường bằng Google Maps" })
    ).toBeInTheDocument();
  });

  it("opens the URL via openOutApp when clicked", async () => {
    const user = userEvent.setup();
    const url = "https://maps.google.com/?q=Den+Ba";
    render(<DirectionsButton googleMapsUrl={url} />);

    await user.click(screen.getByRole("button", { name: "Chỉ đường bằng Google Maps" }));

    expect(openOutAppMock).toHaveBeenCalledWith({ url });
  });

  it("falls back to window.open when openOutApp fails", async () => {
    openOutAppMock.mockRejectedValue(new Error("not supported"));
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();
    const url = "https://maps.google.com/?q=Den+Ba";
    render(<DirectionsButton googleMapsUrl={url} />);

    await user.click(screen.getByRole("button", { name: "Chỉ đường bằng Google Maps" }));
    await vi.waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(url, "_blank", "noopener,noreferrer");
    });

    windowOpenSpy.mockRestore();
  });

  it("accepts a custom label", () => {
    render(
      <DirectionsButton
        googleMapsUrl="https://maps.google.com/?q=Den+Ba"
        label="Xem đường đi"
      />
    );
    expect(screen.getByRole("button", { name: "Xem đường đi" })).toBeInTheDocument();
  });
});
