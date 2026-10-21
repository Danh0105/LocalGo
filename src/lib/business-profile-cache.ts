const entries = new Map<string, unknown>();
const listeners = new Set<() => void>();
let revision = 0;
let generation = 0;

export const businessProfileKeys = {
  mine: (userId: string) => `business-profiles:mine:${userId}`,
  list: (query: string) => `business-profiles:list:${query}`,
  detail: (id: string) => `business-profiles:detail:${id}`,
};

export const getBusinessProfileRevision = () => revision;
export const getBusinessProfileGeneration = () => generation;
export function readBusinessProfileCache<T>(key: string): T | undefined {
  return entries.get(key) as T | undefined;
}
export function writeBusinessProfileCache<T>(key: string, value: T, requestGeneration = generation) {
  if (requestGeneration === generation) entries.set(key, value);
}
export function invalidatePublicBusinessProfiles() {
  generation += 1;
  for (const key of entries.keys()) {
    if (!key.startsWith("business-profiles:mine:")) entries.delete(key);
  }
  revision += 1;
  listeners.forEach((listener) => listener());
}
export function clearBusinessProfileCache() {
  entries.clear();
  invalidatePublicBusinessProfiles();
}
export function subscribeBusinessProfiles(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
