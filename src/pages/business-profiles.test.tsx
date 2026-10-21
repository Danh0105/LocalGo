import { type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BusinessProfileManagePage from "./business-profile-manage";
import BusinessProfilesPage from "./business-profiles";
import BusinessProfileDetailPage from "./business-profile-detail";
import BusinessProfileMenu from "@/components/business-profile-menu";
import { businessProfileKeys, clearBusinessProfileCache, readBusinessProfileCache } from "@/lib/business-profile-cache";
import { businessTypeFields, profileFormInput, profileFormValues, profileValidationErrors, validateProfileForm } from "@/lib/business-profile-form";
import { ApiRequestError } from "@/lib/http-client";
import { BUSINESS_TYPE_LABELS, type BusinessProfile, type BusinessType } from "@/types/business-profiles";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(), snackbar: vi.fn(), authenticate: vi.fn(), refreshSession: vi.fn(), refreshUser: vi.fn(),
  user: { id: "owner", role: "BUSINESS", businessType: "GENERAL" } as { id: string; role: string; businessType: string } | null,
  pathname: "/business/profile", id: "profile",
}));
vi.mock("zmp-ui", () => ({
  Page: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>, Icon: () => null,
  useNavigate: () => mocks.navigate, useLocation: () => ({ pathname: mocks.pathname }), useParams: () => ({ id: mocks.id }),
  useSnackbar: () => ({ openSnackbar: mocks.snackbar }),
  Modal: ({ visible, title, description, actions }: { visible: boolean; title: string; description: string; actions: Array<{ key: string; text: string; disabled: boolean; onClick: () => void }> }) => visible ? <div role="dialog" aria-label={title}><p>{description}</p>{actions.map((action) => <button key={action.key} disabled={action.disabled} onClick={action.onClick}>{action.text}</button>)}</div> : null,
}));
vi.mock("@/contexts/auth-context", () => ({
  useCurrentUser: () => ({ user: mocks.user, accessToken: mocks.user ? "test-only-old" : null, status: mocks.user ? "authenticated" : "idle", authenticate: mocks.authenticate, refreshSession: mocks.refreshSession, refreshUser: mocks.refreshUser }),
}));
vi.mock("zmp-sdk/apis", () => ({ openPhone: vi.fn().mockResolvedValue(undefined), openOutApp: vi.fn().mockResolvedValue(undefined), openWebview: vi.fn().mockResolvedValue(undefined) }));

const profile = (extra: Partial<BusinessProfile> = {}): BusinessProfile => ({
  id: "profile", userId: "owner", businessType: "GENERAL", businessName: "Cơ sở đã duyệt", businessCategory: "Địa phương",
  contactName: "Chủ cơ sở", contactPhone: "0900123456", contactEmail: "owner@example.com", address: "Truông Mít",
  templeName: null, openingHours: null, seatingCapacity: null, roomCount: null, gardenArea: null, mainProducts: null,
  googleMapsUrl: null, lat: null, lng: null, website: null, facebookUrl: null, zaloOaUrl: null, logoUrl: null, coverImageUrl: null, description: null,
  isPublic: true, version: 3, owner: { id: "owner", displayName: "Chủ cơ sở", avatarUrl: null, status: "ACTIVE" },
  createdAt: "2026-10-21T00:00:00Z", updatedAt: "2026-10-21T00:00:00Z", deletedAt: null, ...extra,
});
const json = (data: unknown, meta?: unknown) => new Response(JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }), { headers: { "Content-Type": "application/json" } });
const failure = (status: number, code: string, message = code, details?: unknown) => new Response(JSON.stringify({ success: false, error: { code, message, details } }), { status, headers: { "Content-Type": "application/json" } });
const absent = () => failure(404, "BUSINESS_PROFILE_NOT_FOUND");
function stubFetch(...responses: Array<() => Response>) {
  const fetch = vi.fn();
  for (const response of responses) fetch.mockImplementationOnce(async () => response());
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
function fillCommon() {
  for (const [label, value] of Object.entries({ "Tên cơ sở": "Cơ sở mới", "Người liên hệ": "Chủ cơ sở", "Số điện thoại": "0900123456", "Email liên hệ": "owner@example.com", "Địa chỉ": "Truông Mít" })) {
    fireEvent.change(screen.getByLabelText(`${label} *`), { target: { value } });
  }
}
beforeEach(() => {
  vi.clearAllMocks(); clearBusinessProfileCache();
  mocks.user = { id: "owner", role: "BUSINESS", businessType: "GENERAL" };
  mocks.pathname = "/business/profile"; mocks.id = "profile";
  mocks.refreshSession.mockResolvedValue({ accessToken: "test-only-new" });
  mocks.refreshUser.mockResolvedValue(mocks.user);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("business profile management", () => {
  it("hides management from USER and exposes it only to BUSINESS", () => {
    mocks.user!.role = "USER";
    const view = render(<BusinessProfileMenu />);
    expect(screen.queryByText("Hồ sơ cơ sở")).not.toBeInTheDocument();
    mocks.user!.role = "BUSINESS"; view.rerender(<BusinessProfileMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Hồ sơ cơ sở" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/business/profile");
  });
  it("blocks direct management access for USER without requesting private endpoints", () => {
    mocks.user!.role = "USER";
    const fetch = stubFetch();
    render(<BusinessProfileManagePage />);
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký BUSINESS" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/business/register");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each<BusinessType>(["TEMPLE_MANAGEMENT", "RESTAURANT", "ACCOMMODATION", "GARDEN", "GENERAL"])("renders only approved %s fields when the profile does not exist", async (type) => {
    mocks.user!.businessType = type;
    stubFetch(absent);
    const view = render(<BusinessProfileManagePage />);
    await screen.findByText("Tạo hồ sơ cơ sở");
    expect(screen.getByText(`Loại hình đã duyệt: ${BUSINESS_TYPE_LABELS[type]}`)).toBeInTheDocument();
    for (const name of ["templeName", "openingHours", "seatingCapacity", "roomCount", "gardenArea", "mainProducts"]) {
      expect(Boolean(view.container.querySelector(`[name="${name}"]`))).toBe(businessTypeFields[type].some((field) => field.name === name));
    }
    expect(view.container.querySelector('[name="businessType"]')).toBeNull();
  });
  it.each(["TEMPLE_MANAGEMENT", "GARDEN"] as BusinessType[])("does not submit %s without its required field", async (type) => {
    mocks.user!.businessType = type;
    const fetch = stubFetch(absent);
    render(<BusinessProfileManagePage />);
    await screen.findByText("Tạo hồ sơ cơ sở"); fillCommon();
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng nhập");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("creates from a 404, hydrates the server response and omits businessType and stale role fields", async () => {
    mocks.user!.businessType = "GARDEN";
    const fetch = stubFetch(absent, () => json(profile({ businessType: "GARDEN", businessName: "Tên server chuẩn hóa", mainProducts: "Bưởi", version: 1 })));
    render(<BusinessProfileManagePage />);
    await screen.findByText("Tạo hồ sơ cơ sở"); fillCommon();
    fireEvent.change(screen.getByLabelText("Sản phẩm chính *"), { target: { value: "Bưởi" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Tên server chuẩn hóa");
    const payload = JSON.parse(fetch.mock.calls[1][1].body);
    expect(payload).toMatchObject({ businessName: "Cơ sở mới", mainProducts: "Bưởi" });
    for (const field of ["businessType", "version", "templeName", "roomCount", "seatingCapacity", "openingHours"]) expect(payload).not.toHaveProperty(field);
    expect(readBusinessProfileCache(businessProfileKeys.mine("owner"))).toMatchObject({ version: 1, businessName: "Tên server chuẩn hóa" });
  });
  it("updates with the current version and uses the increased response version on the next edit", async () => {
    const fetch = stubFetch(() => json(profile()), () => json(profile({ version: 4, businessName: "Đã sửa" })), () => json(profile({ version: 5 })));
    render(<BusinessProfileManagePage />);
    await screen.findByText("Cơ sở đã duyệt");
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa hồ sơ" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Đã sửa");
    expect(JSON.parse(fetch.mock.calls[1][1].body).version).toBe(3);
    expect(readBusinessProfileCache(businessProfileKeys.mine("owner"))).toMatchObject({ version: 4 });
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa hồ sơ" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Cơ sở đã duyệt");
    expect(JSON.parse(fetch.mock.calls[2][1].body).version).toBe(4);
  });
  it("reloads a version conflict for review without automatically overwriting it", async () => {
    const fetch = stubFetch(() => json(profile()), () => failure(409, "BUSINESS_PROFILE_VERSION_CONFLICT"), () => json(profile({ version: 7, businessName: "Bản thiết bị khác" })));
    render(<BusinessProfileManagePage />);
    await screen.findByText("Cơ sở đã duyệt");
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa hồ sơ" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Hồ sơ đã được cập nhật ở thiết bị khác");
    expect(screen.getByText("Bản thiết bị khác")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("button", { name: "Lưu hồ sơ" })).not.toBeInTheDocument();
    expect(readBusinessProfileCache(businessProfileKeys.mine("owner"))).toMatchObject({ version: 7 });
  });
  it("recovers an already-existing profile into edit mode", async () => {
    stubFetch(absent, () => failure(409, "BUSINESS_PROFILE_ALREADY_EXISTS"), () => json(profile({ version: 6 })));
    render(<BusinessProfileManagePage />);
    await screen.findByText("Tạo hồ sơ cơ sở"); fillCommon();
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Chỉnh sửa hồ sơ");
    expect(screen.getByLabelText("Tên cơ sở *")).toHaveValue("Cơ sở đã duyệt");
  });
  it("requires confirmation before DELETE, handles 204, then creates again", async () => {
    const fetch = stubFetch(() => json(profile()), () => new Response(null, { status: 204 }), () => json(profile({ businessName: "Khôi phục", version: 5 })));
    render(<BusinessProfileManagePage />);
    await screen.findByText("Cơ sở đã duyệt");
    fireEvent.click(screen.getByRole("button", { name: "Xóa hồ sơ" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Hồ sơ sẽ biến mất khỏi trang công khai");
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    await screen.findByText("Tạo hồ sơ cơ sở");
    expect(fetch.mock.calls[1][1].method).toBe("DELETE");
    fillCommon(); fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Khôi phục");
    expect(fetch.mock.calls[2][1].method).toBe("POST");
  });
  it("keeps draft values and maps server validation into fields and toast", async () => {
    stubFetch(absent, () => failure(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", [{ field: "contactEmail", message: "Email đã bị chặn" }]));
    render(<BusinessProfileManagePage />);
    await screen.findByText("Tạo hồ sơ cơ sở"); fillCommon();
    fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));
    await screen.findByText("Email đã bị chặn");
    expect(screen.getByLabelText("Tên cơ sở *")).toHaveValue("Cơ sở mới");
    expect(mocks.snackbar).toHaveBeenCalledWith(expect.objectContaining({ text: "Dữ liệu không hợp lệ", type: "error" }));
  });
  it("refreshes 401 once and completes the request without login or redirect", async () => {
    const fetch = stubFetch(() => failure(401, "UNAUTHORIZED"), () => json(profile()));
    render(<BusinessProfileManagePage />);
    await screen.findByText("Cơ sở đã duyệt");
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer test-only-new");
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("refreshes /users/me on BUSINESS_ACCOUNT_REQUIRED and redirects a demoted account", async () => {
    mocks.refreshUser.mockResolvedValue({ id: "owner", role: "USER" });
    stubFetch(() => failure(403, "BUSINESS_ACCOUNT_REQUIRED"));
    render(<BusinessProfileManagePage />);
    await waitFor(() => expect(mocks.refreshUser).toHaveBeenCalledOnce());
    expect(mocks.navigate).toHaveBeenCalledWith("/business/register", { replace: true });
  });

  it("blocks double submit while a save is pending", async () => {
    let resolve!: (value: Response) => void;
    const fetch = vi.fn().mockImplementationOnce(async () => absent()).mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", fetch);
    const view = render(<BusinessProfileManagePage />);
    await screen.findByText("Tạo hồ sơ cơ sở"); fillCommon();
    const form = view.container.querySelector("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => resolve(json(profile())));
    await screen.findByText("Cơ sở đã duyệt");
  });

  it("stops after one refresh attempt when the retried request is also unauthorized", async () => {
    const fetch = stubFetch(() => failure(401, "UNAUTHORIZED", "Hết phiên"), () => failure(401, "UNAUTHORIZED", "Không thể đọc hồ sơ"));
    render(<BusinessProfileManagePage />);
    await screen.findByText("Không thể đọc hồ sơ");
    expect(mocks.refreshSession).toHaveBeenCalledOnce(); expect(fetch).toHaveBeenCalledTimes(2);
    expect(mocks.authenticate).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
  });
});

describe("public business profiles", () => {
  it("lists, searches, filters, paginates and navigates without authentication", async () => {
    mocks.user = null; mocks.pathname = "/business-profiles";
    const meta = { page: 1, limit: 10, total: 11, totalPages: 2 };
    const fetch = stubFetch(() => json([profile()], meta), () => json([profile({ id: "second", businessName: "Cơ sở thứ hai" })], { ...meta, page: 2 }), () => json([], { ...meta, total: 0, totalPages: 0 }));
    render(<BusinessProfilesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Cơ sở đã duyệt/ }));
    expect(mocks.navigate).toHaveBeenCalledWith("/business-profiles/profile");
    fireEvent.click(screen.getByRole("button", { name: "Xem thêm cơ sở" }));
    await screen.findByText("Cơ sở thứ hai");
    expect(new URL(fetch.mock.calls[1][0]).searchParams.get("page")).toBe("2");
    fireEvent.change(screen.getByLabelText("Loại hình"), { target: { value: "GARDEN" } });
    fireEvent.change(screen.getByLabelText("Tìm cơ sở"), { target: { value: "bưởi" } });
    await screen.findByText("Chưa tìm thấy cơ sở phù hợp.");
    const url = new URL(fetch.mock.calls[2][0]);
    expect(url.searchParams.get("search")).toBe("bưởi"); expect(url.searchParams.get("businessType")).toBe("GARDEN");
    for (const [, options] of fetch.mock.calls) expect(options.headers.Authorization).toBeUndefined();
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });
  it("shows public role information and safe external actions while hiding null fields", async () => {
    mocks.user = null; mocks.pathname = "/business-profiles/profile";
    stubFetch(() => json(profile({ businessType: "GARDEN", mainProducts: "Bưởi", website: "https://example.com", facebookUrl: "https://facebook.com/example", zaloOaUrl: "https://zalo.me/example", lat: 11, lng: 106 })));
    render(<BusinessProfileDetailPage />);
    await screen.findByText("Cơ sở đã duyệt");
    expect(screen.getByText("Bưởi")).toBeInTheDocument();
    expect(screen.queryByText("Giờ mở cửa")).not.toBeInTheDocument();
    for (const name of ["Gọi điện", "Mở Google Maps"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    for (const name of ["Website", "Facebook", "Zalo OA"]) expect(screen.getByRole("link", { name })).toHaveAttribute("target", "_blank");
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });
  it("handles a public missing profile without a login prompt", async () => {
    mocks.user = null; mocks.pathname = "/business-profiles/profile";
    stubFetch(absent);
    render(<BusinessProfileDetailPage />);
    await screen.findByText("Hồ sơ không còn công khai hoặc đã được gỡ.");
    fireEvent.click(screen.getByRole("button", { name: "Quay lại danh sách cơ sở" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/business-profiles", { replace: true });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("aborts an old search and ignores its late response, then supports pull-to-refresh", async () => {
    mocks.user = null; mocks.pathname = "/business-profiles";
    let resolve!: (value: Response) => void;
    const meta = { page: 1, limit: 10, total: 1, totalPages: 1 };
    const fetch = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; }))
      .mockImplementation(async () => json([profile({ businessName: "Kết quả mới" })], meta));
    vi.stubGlobal("fetch", fetch);
    render(<BusinessProfilesPage />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Tìm cơ sở"), { target: { value: "mới" } });
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    await screen.findByText("Kết quả mới");
    await act(async () => resolve(json([profile({ businessName: "Kết quả cũ" })], meta)));
    expect(screen.queryByText("Kết quả cũ")).not.toBeInTheDocument();
    const page = screen.getByRole("heading", { name: "Cơ sở địa phương" }).closest(".business-profiles-page")!;
    fireEvent.touchStart(page, { touches: [{ clientY: 10 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientY: 110 }] });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  });

  it("retries page one after cached feed revalidation fails, even when the old page has no next page", async () => {
    mocks.user = null; mocks.pathname = "/business-profiles";
    const meta = { page: 1, limit: 10, total: 1, totalPages: 1 };
    const fetch = stubFetch(() => json([profile()], meta), () => failure(503, "UNAVAILABLE", "Tạm thời gián đoạn"), () => json([profile({ businessName: "Sau khi thử lại" })], meta));
    const view = render(<BusinessProfilesPage />);
    await screen.findByText("Cơ sở đã duyệt");
    view.unmount(); render(<BusinessProfilesPage />);
    await screen.findByText("Tạm thời gián đoạn");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("Sau khi thử lại");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(new URL(fetch.mock.calls[2][0]).searchParams.get("page")).toBe("1");
  });
});

describe("profile field boundaries", () => {
  it("drops role-incompatible values during hydration and serialization", () => {
    const values = profileFormValues(profile({ templeName: "Old", roomCount: 20 }), "GARDEN");
    expect(values).not.toHaveProperty("templeName"); expect(values).not.toHaveProperty("roomCount");
    const payload = profileFormInput({ ...values, templeName: "Old", roomCount: "20" }, "GARDEN", false);
    expect(payload).not.toHaveProperty("templeName"); expect(payload).not.toHaveProperty("roomCount");
  });
  it("validates coordinates, VN phone, email, URLs and optional numeric capacity", () => {
    const values = profileFormValues(profile(), "RESTAURANT");
    expect(validateProfileForm({ ...values, lat: "0", lng: "0" }, "RESTAURANT")).toEqual({});
    expect(validateProfileForm({ ...values, lat: "11", lng: "", contactPhone: "123", contactEmail: "bad", website: "javascript:alert(1)", seatingCapacity: "-1" }, "RESTAURANT")).toMatchObject({ lng: expect.any(String), contactPhone: expect.any(String), contactEmail: expect.any(String), website: expect.any(String), seatingCapacity: expect.any(String) });
    expect(validateProfileForm({ ...values, lat: "91", lng: "181" }, "RESTAURANT")).toMatchObject({ lat: expect.any(String), lng: expect.any(String) });
    expect(profileValidationErrors(new ApiRequestError("Invalid", { code: "VALIDATION_ERROR", details: { fieldErrors: { contactPhone: ["Sai số điện thoại"] } } }))).toEqual({ contactPhone: "Sai số điện thoại" });
  });
});
