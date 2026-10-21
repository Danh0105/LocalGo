import { ApiRequestError, apiPaginatedRequest, apiRequest } from "@/lib/http-client";
import {
  businessProfileKeys, getBusinessProfileGeneration,
  invalidatePublicBusinessProfiles, writeBusinessProfileCache,
} from "@/lib/business-profile-cache";
import type { BusinessProfile, BusinessProfileInput, BusinessProfileQuery } from "@/types/business-profiles";

export function businessProfileQueryString(query: BusinessProfileQuery = {}) {
  const params = new URLSearchParams();
  if (query.businessType) params.set("businessType", query.businessType);
  if (query.search?.trim()) params.set("search", query.search.trim());
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));
  params.set("sortOrder", query.sortOrder ?? "desc");
  return params.toString();
}

export async function getBusinessProfiles(query: BusinessProfileQuery = {}, signal?: AbortSignal) {
  const params = businessProfileQueryString(query);
  const generation = getBusinessProfileGeneration();
  const result = await apiPaginatedRequest<BusinessProfile>(`/business-profiles?${params}`, { signal, cache: "no-cache" });
  writeBusinessProfileCache(businessProfileKeys.list(params), result, generation);
  return result;
}
export async function getBusinessProfile(idOrUserId: string, signal?: AbortSignal) {
  const generation = getBusinessProfileGeneration();
  const result = await apiRequest<BusinessProfile>(`/business-profiles/${encodeURIComponent(idOrUserId)}`, { signal, cache: "no-cache" });
  writeBusinessProfileCache(businessProfileKeys.detail(idOrUserId), result, generation);
  return result;
}
export async function getMyBusinessProfile(token: string, userId: string, signal?: AbortSignal) {
  try {
    const result = await apiRequest<BusinessProfile>("/business-profiles/me", {
      signal, cache: "no-store", headers: { Authorization: `Bearer ${token}` },
    });
    writeBusinessProfileCache(businessProfileKeys.mine(userId), result);
    return result;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404 && error.code === "BUSINESS_PROFILE_NOT_FOUND") writeBusinessProfileCache(businessProfileKeys.mine(userId), null);
    throw error;
  }
}

async function saveBusinessProfile(token: string, userId: string, input: BusinessProfileInput, version?: number) {
  const result = await apiRequest<BusinessProfile>(version === undefined ? "/business-profiles" : "/business-profiles/me", {
    method: version === undefined ? "POST" : "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, ...(version === undefined ? {} : { version }) }),
  });
  writeBusinessProfileCache(businessProfileKeys.mine(userId), result);
  invalidatePublicBusinessProfiles();
  return result;
}
export const createBusinessProfile = (token: string, userId: string, input: BusinessProfileInput) => saveBusinessProfile(token, userId, input);
export const updateBusinessProfile = (token: string, userId: string, input: BusinessProfileInput, version: number) => saveBusinessProfile(token, userId, input, version);
export async function deleteBusinessProfile(token: string, userId: string) {
  await apiRequest<void>("/business-profiles/me", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  writeBusinessProfileCache(businessProfileKeys.mine(userId), null);
  invalidatePublicBusinessProfiles();
}
