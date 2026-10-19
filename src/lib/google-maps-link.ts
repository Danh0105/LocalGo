const MAPS_ONLY_HOSTS = new Set(["maps.google.com", "maps.app.goo.gl"]);
const MAPS_PATH_REQUIRED_HOSTS = new Set(["google.com", "www.google.com", "goo.gl"]);

export function isValidGoogleMapsUrl(
  value: string | null | undefined
): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (MAPS_ONLY_HOSTS.has(host)) return true;
  if (MAPS_PATH_REQUIRED_HOSTS.has(host)) {
    return url.pathname.toLowerCase().startsWith("/maps");
  }
  return false;
}
