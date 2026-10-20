/**
 * Nhận đúng các URL Google Maps theo allowlist của backend.
 * Không tự dựng URL từ tên/địa chỉ và không follow short link.
 */
export function getSafeCuisineMapsUrl(value?: string | null): string | undefined {
  if (!value || value.length > 2048 || value !== value.trim()) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return undefined;
    }
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    if (
      ((hostname === 'www.google.com' || hostname === 'google.com') &&
        (path === '/maps' || path.startsWith('/maps/'))) ||
      (hostname === 'maps.google.com') ||
      (hostname === 'maps.app.goo.gl' && path.length > 1) ||
      (hostname === 'goo.gl' && path.startsWith('/maps/'))
    ) {
      return value;
    }
  } catch {
    // URL không parse được.
  }
  return undefined;
}

