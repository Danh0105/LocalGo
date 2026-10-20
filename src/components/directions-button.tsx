import { useState } from "react";
import { openOutApp, openWebview } from "zmp-sdk/apis";
import { Icon } from "zmp-ui";

import { isValidGoogleMapsUrl } from "@/lib/google-maps-link";
import "@/css/components/directions-button.css";

class MapsOpenError extends Error {
  constructor(readonly supportCode: string) {
    super("MAPS_OPEN_FAILED");
  }
}

function failureCode(error: unknown): string {
  if (error instanceof Error && error.message === "MAPS_OPEN_TIMEOUT") return "TIMEOUT";
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (/^-?\d{1,8}$/.test(code)) return code;
  }
  return "UNKNOWN";
}

async function withOpenTimeout(operation: () => Promise<void>): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("MAPS_OPEN_TIMEOUT")), 5000);
    });
    await Promise.race([operation(), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function openExternally(url: string): Promise<"native" | "browser" | "webview"> {
  if (!isValidGoogleMapsUrl(url)) throw new Error("INVALID_MAPS_URL");
  // The SDK resolves without opening anything in the localhost simulator.
  // Open immediately on the web to preserve the browser's click activation.
  const userAgent = navigator.userAgent;
  const hasNativeBridge = "ZaloJavaScriptInterface" in window;
  const isZaloMobile = /android|iphone|ipad|ipod/i.test(userAgent)
    && (hasNativeBridge || /zalo/i.test(userAgent));
  if (!isZaloMobile) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "browser";
  }

  try {
    await withOpenTimeout(() => openOutApp({ url }));
    return "native";
  } catch (externalError) {
    // External opening is unavailable on this device/session. Use the public
    // Zalo browser API rather than a popup after the click activation expired.
    try {
      await withOpenTimeout(() => openWebview({ url, config: { style: "normal" } }));
      return "webview";
    } catch (webviewError) {
      throw new MapsOpenError(`${failureCode(externalError)}/${failureCode(webviewError)}`);
    }
  }
}

interface DirectionsButtonProps {
  googleMapsUrl?: string | null;
  label?: string;
  className?: string;
}

function DirectionsButton({
  googleMapsUrl,
  label = "Chỉ đường bằng Google Maps",
  className,
}: DirectionsButtonProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [fallback, setFallback] = useState<{ url: string; failed: boolean; supportCode?: string }>();
  if (!isValidGoogleMapsUrl(googleMapsUrl)) return null;
  const url = googleMapsUrl!.trim();

  async function handleClick() {
    setIsOpening(true);
    setFallback(undefined);
    try {
      const method = await openExternally(url);
      // A native success callback acknowledges the request, not that Maps
      // actually appeared. Keep a user-initiated HTTPS alternative available.
      if (method !== "browser") setFallback({ url, failed: false });
    } catch (error) {
      setFallback({
        url,
        failed: true,
        supportCode: error instanceof MapsOpenError ? error.supportCode : undefined,
      });
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={className ? `directions-button ${className}` : "directions-button"}
        disabled={isOpening}
        aria-busy={isOpening}
        onClick={() => void handleClick()}
      >
        <Icon icon="zi-location" aria-hidden="true" />
        <span>{label}</span>
      </button>
      {fallback?.url === url && (
        <span className="directions-button__fallback" role="status">
          {fallback.failed ? "Không thể tự động mở bản đồ. " : "Nếu bản đồ chưa mở: "}
          {fallback.supportCode && <span>Mã hỗ trợ: {fallback.supportCode}. </span>}
          <a href={url} target="_blank" rel="noopener noreferrer">Mở Google Maps</a>
        </span>
      )}
    </>
  );
}

export default DirectionsButton;
