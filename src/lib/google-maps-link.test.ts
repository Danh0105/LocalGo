import { describe, expect, it } from "vitest";

import { isValidGoogleMapsUrl } from "./google-maps-link";

describe("isValidGoogleMapsUrl", () => {
  it("accepts https maps.google.com links", () => {
    expect(isValidGoogleMapsUrl("https://maps.google.com/?q=Den+Ba")).toBe(true);
  });

  it("accepts https www.google.com/maps links", () => {
    expect(
      isValidGoogleMapsUrl("https://www.google.com/maps/place/Den+Ba/@11,106,15z")
    ).toBe(true);
  });

  it("accepts https google.com/maps links", () => {
    expect(isValidGoogleMapsUrl("https://google.com/maps?q=Den+Ba")).toBe(true);
  });

  it("accepts https goo.gl/maps short links", () => {
    expect(isValidGoogleMapsUrl("https://goo.gl/maps/AbCdEf123")).toBe(true);
  });

  it("accepts https maps.app.goo.gl short links", () => {
    expect(isValidGoogleMapsUrl("https://maps.app.goo.gl/AbCdEf123")).toBe(true);
  });

  it("rejects empty or missing values", () => {
    expect(isValidGoogleMapsUrl("")).toBe(false);
    expect(isValidGoogleMapsUrl("   ")).toBe(false);
    expect(isValidGoogleMapsUrl(null)).toBe(false);
    expect(isValidGoogleMapsUrl(undefined)).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isValidGoogleMapsUrl("not a url")).toBe(false);
    expect(isValidGoogleMapsUrl("maps.google.com")).toBe(false);
  });

  it("rejects http (non-https) Google Maps links", () => {
    expect(isValidGoogleMapsUrl("http://maps.google.com/?q=Den+Ba")).toBe(false);
  });

  it("rejects google.com links outside /maps", () => {
    expect(isValidGoogleMapsUrl("https://www.google.com/search?q=Den+Ba")).toBe(
      false
    );
    expect(isValidGoogleMapsUrl("https://google.com/")).toBe(false);
  });

  it("rejects bare goo.gl short links without /maps", () => {
    expect(isValidGoogleMapsUrl("https://goo.gl/AbCdEf")).toBe(false);
  });

  it("rejects unrelated domains, including lookalike/spoofed hosts", () => {
    expect(isValidGoogleMapsUrl("https://example.com/maps")).toBe(false);
    expect(isValidGoogleMapsUrl("https://maps.google.com.evil.com/")).toBe(false);
    expect(isValidGoogleMapsUrl("https://evilgoogle.com/maps")).toBe(false);
    expect(
      isValidGoogleMapsUrl("https://maps.google.com@evil.com/?q=Den+Ba")
    ).toBe(false);
  });
});
