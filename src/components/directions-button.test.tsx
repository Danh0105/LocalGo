import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DirectionsButton from "./directions-button";

const { openOutAppMock, openWebviewMock } = vi.hoisted(() => ({
  openOutAppMock: vi.fn(),
  openWebviewMock: vi.fn(),
}));

vi.mock("zmp-sdk/apis", () => ({
  openOutApp: openOutAppMock,
  openWebview: openWebviewMock,
}));

describe("DirectionsButton", () => {
  beforeEach(() => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 13) Zalo/24.10");
    openOutAppMock.mockReset();
    openOutAppMock.mockResolvedValue(undefined);
    openWebviewMock.mockReset();
    openWebviewMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
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
    expect(openWebviewMock).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Mở Google Maps" })).toHaveAttribute("href", url);
  });

  it("passes the reported Android short link unchanged to the native SDK", async () => {
    const url = "https://maps.app.goo.gl/6Zd7k6zJku9ht6jK6";
    render(<DirectionsButton googleMapsUrl={url} />);
    await userEvent.setup().click(screen.getByRole("button"));
    expect(openOutAppMock).toHaveBeenCalledWith({ url });
    expect(screen.getByRole("link", { name: "Mở Google Maps" })).toHaveAttribute("href", url);
  });

  it("offers a direct link when openOutApp fails instead of an async popup", async () => {
    openOutAppMock.mockRejectedValue({ code: -1403 });
    openWebviewMock.mockRejectedValue({ code: -1404 });
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();
    const url = "https://maps.google.com/?q=Den+Ba";
    render(<DirectionsButton googleMapsUrl={url} />);

    await user.click(screen.getByRole("button", { name: "Chỉ đường bằng Google Maps" }));
    const fallback = await screen.findByRole("link", { name: "Mở Google Maps" });
    expect(fallback).toHaveAttribute("href", url);
    expect(fallback).toHaveAttribute("target", "_blank");
    expect(fallback).toHaveAttribute("rel", "noopener noreferrer");
    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(openWebviewMock).toHaveBeenCalledWith({ url, config: { style: "normal" } });
    expect(screen.getByRole("status")).toHaveTextContent("Mã hỗ trợ: -1403/-1404");

    windowOpenSpy.mockRestore();
  });

  it("trims the URL before opening and supports keyboard activation", async () => {
    const user = userEvent.setup();
    render(<DirectionsButton googleMapsUrl="  https://google.com/maps  " />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(openOutAppMock).toHaveBeenCalledWith({ url: "https://google.com/maps" });
  });

  it("falls back when the SDK throws synchronously", async () => {
    openOutAppMock.mockImplementation(() => { throw new Error("unavailable"); });
    const spy = vi.spyOn(window, "open").mockReturnValue(null);
    const user = userEvent.setup();
    render(<DirectionsButton googleMapsUrl="https://google.com/maps" />);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("link", { name: "Mở Google Maps" })).toHaveAttribute("href", "https://google.com/maps");
    expect(spy).not.toHaveBeenCalled();
    expect(openWebviewMock).toHaveBeenCalledWith({ url: "https://google.com/maps", config: { style: "normal" } });
    spy.mockRestore();
  });

  it("opens the reported short link in the Zalo browser when external opening fails", async () => {
    const url = "https://maps.app.goo.gl/6Zd7k6zJku9ht6jK6";
    openOutAppMock.mockRejectedValue({ code: -1403 });
    render(<DirectionsButton googleMapsUrl={url} />);
    await userEvent.setup().click(screen.getByRole("button"));
    expect(openWebviewMock).toHaveBeenCalledWith({ url, config: { style: "normal" } });
    expect(screen.getByRole("status")).not.toHaveTextContent("Không thể tự động mở bản đồ");
  });

  it("times out both native methods and makes the direct link available", async () => {
    vi.useFakeTimers();
    openOutAppMock.mockReturnValue(new Promise(() => {}));
    openWebviewMock.mockReturnValue(new Promise(() => {}));
    render(<DirectionsButton googleMapsUrl="https://google.com/maps" />);
    act(() => screen.getByRole("button").click());
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByRole("status")).toHaveTextContent("Mã hỗ trợ: TIMEOUT/TIMEOUT");
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it.each([
    "Mozilla/5.0 (Windows NT 10.0) Chrome/130",
    "Mozilla/5.0 (Linux; Android 13) Chrome/130",
  ])("opens synchronously in a browser/simulator without the SDK: %s", async (userAgent) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    const spy = vi.spyOn(window, "open").mockReturnValue(null);
    render(<DirectionsButton googleMapsUrl="https://google.com/maps" />);
    // No await: the popup must open in the original click event.
    act(() => screen.getByRole("button").click());
    expect(spy).toHaveBeenCalledWith("https://google.com/maps", "_blank", "noopener,noreferrer");
    expect(openOutAppMock).not.toHaveBeenCalled();
    await act(async () => {});
  });

  it("uses the external SDK on iPhone", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone) Zalo/24.10");
    render(<DirectionsButton googleMapsUrl="https://google.com/maps" />);
    await userEvent.setup().click(screen.getByRole("button"));
    expect(openOutAppMock).toHaveBeenCalledWith({ url: "https://google.com/maps" });
  });

  it("recognizes the Android native bridge even without Zalo in the user agent", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 13) wv");
    vi.stubGlobal("ZaloJavaScriptInterface", { jsCall: vi.fn() });
    render(<DirectionsButton googleMapsUrl="https://google.com/maps" />);
    await userEvent.setup().click(screen.getByRole("button"));
    expect(openOutAppMock).toHaveBeenCalledWith({ url: "https://google.com/maps" });
  });

  it("offers a direct link if the native SDK never responds", async () => {
    vi.useFakeTimers();
    openOutAppMock.mockReturnValue(new Promise(() => {}));
    render(<DirectionsButton googleMapsUrl="https://google.com/maps" />);
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("button")).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole("link", { name: "Mở Google Maps" })).toHaveAttribute("href", "https://google.com/maps");
    expect(screen.getByRole("button")).toBeEnabled();
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
