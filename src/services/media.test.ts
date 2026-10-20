import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadContentImages } from "./media";

afterEach(() => vi.unstubAllGlobals());
const file = () => new File(["photo"], "photo.webp", { type: "image/webp" });

describe("content batch image upload", () => {
  it("uses repeated files fields and preserves the envelope's order without setting a multipart header", async () => {
    const uploaded = [{ id: "b", url: "/b.webp" }, { id: "a", url: "/a.webp" }];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: uploaded }) });
    vi.stubGlobal("fetch", fetchMock);
    const files = [file(), file()];
    expect(await uploadContentImages("token", files)).toEqual(uploaded);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/media\/images\/batch$/);
    expect(request.headers).toEqual({ Authorization: "Bearer token" });
    expect(request.body.getAll("files")).toHaveLength(2);
    expect(request.body.get("file")).toBeNull();
  });

  it("rejects invalid selections before uploading", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadContentImages("token", Array.from({ length: 11 }, file))).rejects.toThrow("10 ảnh");
    await expect(uploadContentImages("token", [new File(["x"], "x.gif", { type: "image/gif" })])).rejects.toThrow("JPG");
    await expect(uploadContentImages("token", [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })])).rejects.toThrow("5 MB");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves auth status and backend error codes for existing login/refresh handling", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ success: false, error: { code: "TOKEN_EXPIRED", message: "Phiên hết hạn" } }) }));
    await expect(uploadContentImages("token", [file()])).rejects.toMatchObject({ status: 401, code: "TOKEN_EXPIRED" });
  });
});
