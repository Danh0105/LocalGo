import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acknowledgeInitialGardenPassword, getGardenCredentials, issueInitialGardenPassword } from "./garden-credentials";
import { setApiAuthHandler } from "@/lib/http-client";

const status = { email: "owner@example.com", passwordConfigured: false, initialPasswordAcknowledged: false, canIssueInitialPassword: true };
const json = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
beforeEach(() => { vi.stubEnv("VITE_GARDEN_INITIAL_PASSWORD_ENABLED", "true"); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); setApiAuthHandler(null); });
describe("private garden credential contract", () => {
  it("uses only private endpoints, fixed response fields and no request/persisted cache", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ ...status, unwanted: "not cached" })).mockResolvedValueOnce(json({ password: "RandomGarden4827", requiresAcknowledgement: true })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    expect(await getGardenCredentials("access")).toEqual(status);
    expect(await issueInitialGardenPassword("access")).toEqual({ password: "RandomGarden4827", requiresAcknowledgement: true });
    await acknowledgeInitialGardenPassword("access");
    expect(fetch.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
      "/api/v1/business-profiles/me/credentials", "/api/v1/business-profiles/me/credentials/initial-password", "/api/v1/business-profiles/me/credentials/initial-password/acknowledge",
    ]);
    for (const [, init] of fetch.mock.calls) {
      expect(init.headers.Authorization).toBe("Bearer access");
      expect(init.cache).toBe("no-store");
      expect(init.body).toBeUndefined();
    }
  });
  it("does not refresh or retry an issuance or acknowledgement after 401", async () => {
    const refresh = vi.fn();
    setApiAuthHandler({ refresh, expire: vi.fn(), authorize: (token) => token });
    const fetch = vi.fn().mockImplementation(async () => new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetch);
    await expect(issueInitialGardenPassword("access")).rejects.toMatchObject({ status: 401, authHandled: true });
    await expect(acknowledgeInitialGardenPassword("access")).rejects.toMatchObject({ status: 401, authHandled: true });
    expect(refresh).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("rejects inconsistent acknowledgement state without issuing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ...status, initialPasswordAcknowledged: true })));
    await expect(getGardenCredentials("access")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("does not send the issuance request while the production gate is disabled", async () => {
    vi.stubEnv("VITE_GARDEN_INITIAL_PASSWORD_ENABLED", "false");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(issueInitialGardenPassword("access")).rejects.toMatchObject({ code: "FEATURE_UNAVAILABLE" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
