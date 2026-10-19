import { openOutApp } from "zmp-sdk/apis";
import { Icon } from "zmp-ui";

import { isValidGoogleMapsUrl } from "@/lib/google-maps-link";
import "@/css/components/directions-button.css";

function openExternally(url: string): void {
  void openOutApp({ url }).catch(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  });
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
  if (!isValidGoogleMapsUrl(googleMapsUrl)) return null;

  return (
    <button
      type="button"
      className={className ? `directions-button ${className}` : "directions-button"}
      onClick={() => openExternally(googleMapsUrl as string)}
    >
      <Icon icon="zi-location" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export default DirectionsButton;
