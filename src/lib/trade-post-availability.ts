// Trade feeds are held in React state, not persisted in localStorage.
// Keep a session tombstone so a late/stale list response cannot restore a removed post.
const removedSlugs = new Set<string>();
const listeners = new Set<() => void>();

export function invalidateTradePost(slug: string): void {
  removedSlugs.add(slug);
  listeners.forEach((listener) => listener());
}

export function isTradePostAvailable(post: { slug?: string | null }): boolean {
  return typeof post.slug === "string" && post.slug.length > 0 && !removedSlugs.has(post.slug);
}

export function isTradeSearchResultAvailable(item: { resourceType: string; slug?: string | null }): boolean {
  return item.resourceType !== "TRADE_POST" || isTradePostAvailable(item);
}

export function subscribeTradePostInvalidation(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
