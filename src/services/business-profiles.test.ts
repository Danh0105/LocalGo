import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBusinessProfile, deleteBusinessProfile, getBusinessProfile, getBusinessProfiles, getMyBusinessProfile, updateBusinessProfile } from "./business-profiles";
import { businessProfileKeys, clearBusinessProfileCache, getBusinessProfileRevision, readBusinessProfileCache, writeBusinessProfileCache } from "@/lib/business-profile-cache";
import { profileFormInput, profileFormValues } from "@/lib/business-profile-form";
import type { BusinessProfile } from "@/types/business-profiles";

const profile = { id: "profile", userId: "owner", businessType: "GENERAL", businessName: "Cơ sở", version: 4 } as BusinessProfile;
const json = (data: unknown) => new Response(JSON.stringify({ success: true, data, meta: { page: 2, limit: 10, total: 11, totalPages: 2 } }), { headers: { "Content-Type": "application/json" } });
beforeEach(clearBusinessProfileCache);
afterEach(() => vi.unstubAllGlobals());

describe("business profile API and caches", () => {
  it("reads public feeds and details without Authorization, encoding IDs and all supported filters", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json([profile])).mockResolvedValueOnce(json(profile));
    vi.stubGlobal("fetch", fetch);
    const list = await getBusinessProfiles({ businessType: "GARDEN", search: "  xoài & bưởi  ", page: 2, limit: 10, sortOrder: "asc" });
    expect(list.meta.page).toBe(2);
    const url = new URL(fetch.mock.calls[0][0]);
    for (const [key, value] of Object.entries({ businessType: "GARDEN", search: "xoài & bưởi", page: "2", limit: "10", sortOrder: "asc" })) expect(url.searchParams.get(key)).toBe(value);
    await getBusinessProfile("id/user & a");
    expect(fetch.mock.calls[1][0]).toContain(`/business-profiles/${encodeURIComponent("id/user & a")}`);
    for (const [, options] of fetch.mock.calls) expect(options.headers.Authorization).toBeUndefined();
  });
  it("replaces the private cache with server versions and invalidates every public query after mutations", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json(profile)).mockResolvedValueOnce(json({ ...profile, version: 5 })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    const input = profileFormInput(profileFormValues(null, "GENERAL"), "GENERAL", true);
    await createBusinessProfile("test-only-token", "owner", input);
    writeBusinessProfileCache(businessProfileKeys.detail("profile"), profile);
    writeBusinessProfileCache(businessProfileKeys.list("all"), [profile]);
    const previousRevision = getBusinessProfileRevision();
    await updateBusinessProfile("test-only-token", "owner", input, 4);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ version: 4 });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("version");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("businessType");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer test-only-token");
    expect(readBusinessProfileCache(businessProfileKeys.mine("owner"))).toMatchObject({ version: 5 });
    expect(readBusinessProfileCache(businessProfileKeys.mine("other"))).toBeUndefined();
    expect(readBusinessProfileCache(businessProfileKeys.detail("profile"))).toBeUndefined();
    expect(readBusinessProfileCache(businessProfileKeys.list("all"))).toBeUndefined();
    expect(getBusinessProfileRevision()).toBeGreaterThan(previousRevision);
    await deleteBusinessProfile("test-only-token", "owner");
    expect(fetch.mock.calls[2][1].method).toBe("DELETE");
    expect(readBusinessProfileCache(businessProfileKeys.mine("owner"))).toBeNull();
  });
  it("does not let an older response refill public cache after a mutation", async () => {
    let resolve!: (value: Response) => void;
    const fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    const pending = getBusinessProfile("profile");
    await deleteBusinessProfile("test-only-token", "owner");
    resolve(json(profile));
    await pending;
    expect(readBusinessProfileCache(businessProfileKeys.detail("profile"))).toBeUndefined();
  });
  it("clears a missing private profile and preserves backend validation details", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: { code: "BUSINESS_PROFILE_NOT_FOUND", message: "Missing" } }), { status: 404, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    writeBusinessProfileCache(businessProfileKeys.mine("owner"), profile);
    await expect(getMyBusinessProfile("test-only-token", "owner")).rejects.toMatchObject({ status: 404, code: "BUSINESS_PROFILE_NOT_FOUND" });
    expect(readBusinessProfileCache(businessProfileKeys.mine("owner"))).toBeNull();
  });
});
