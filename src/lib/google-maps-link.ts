const MAPS_ONLY_HOSTS = new Set(["maps.google.com", "maps.app.goo.gl"]);
const MAPS_PATH_REQUIRED_HOSTS = new Set(["google.com", "www.google.com", "goo.gl"]);

export function isValidGoogleMapsUrl(
  value: string | null | undefined
): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  // Reject URL parser repairs (backslashes, missing slashes, control characters).
  if (!/^https:\/\/[^/]/i.test(trimmed) || /[\\\u0000-\u0020\u007f]/.test(trimmed)) return false;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;

  const host = url.hostname.toLowerCase();
  if (MAPS_ONLY_HOSTS.has(host)) return true;
  if (MAPS_PATH_REQUIRED_HOSTS.has(host)) {
    return url.pathname === "/maps" || url.pathname.startsWith("/maps/");
  }
  return false;
}
