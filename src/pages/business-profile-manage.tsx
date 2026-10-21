import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, useLocation, useNavigate, useSnackbar } from "zmp-ui";
import BusinessProfileForm from "@/components/business-profile-form";
import BusinessProfileView, { BusinessProfileShell, ProfileState } from "@/components/business-profile-view";
import { useCurrentUser } from "@/contexts/auth-context";
import { useAuthenticatedRequest } from "@/hooks/use-authenticated-request";
import { ApiRequestError, getApiErrorMessage } from "@/lib/http-client";
import { createBusinessProfile, deleteBusinessProfile, getMyBusinessProfile, updateBusinessProfile } from "@/services/business-profiles";
import { isBusinessType, type BusinessProfile, type BusinessProfileInput } from "@/types/business-profiles";

export default function BusinessProfileManagePage() {
  const auth = useCurrentUser();
  const authRef = useRef(auth);
  authRef.current = auth;
  const userId = auth.user?.id;
  const role = auth.user?.role;
  const request = useAuthenticatedRequest();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { openSnackbar } = useSnackbar();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteLock = useRef(false);

  const reloadMine = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return null;
    try { return await request((token) => getMyBusinessProfile(token, userId, signal)); }
    catch (e) {
      if (e instanceof ApiRequestError && e.status === 404 && e.code === "BUSINESS_PROFILE_NOT_FOUND") return null;
      throw e;
    }
  }, [userId, request]);

  const checkAccess = useCallback(async (e: unknown) => {
    if (e instanceof ApiRequestError && e.status === 403 && e.code === "BUSINESS_ACCOUNT_REQUIRED") {
      const user = await authRef.current.refreshUser();
      if (user.role !== "BUSINESS") navigate("/business/register", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (role !== "BUSINESS") { setProfile(null); setLoading(false); return; }
    if (pathname !== "/business/profile") return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    reloadMine(controller.signal).then((result) => {
      if (!controller.signal.aborted) { setProfile(result); setEditing(!result); }
    }).catch(async (e) => {
      if (controller.signal.aborted) return;
      setError(getApiErrorMessage(e));
      try { await checkAccess(e); } catch (accessError) { if (!controller.signal.aborted) setError(getApiErrorMessage(accessError)); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [role, pathname, reloadMine, revision, checkAccess]);

  async function save(input: BusinessProfileInput) {
    if (!userId) return;
    try {
      const result = await request((token) => profile
        ? updateBusinessProfile(token, userId, input, profile.version)
        : createBusinessProfile(token, userId, input));
      setProfile(result);
      setEditing(false);
      setNotice("");
      openSnackbar({ text: "Đã lưu hồ sơ cơ sở", type: "success" });
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 409 && ["BUSINESS_PROFILE_ALREADY_EXISTS", "BUSINESS_PROFILE_VERSION_CONFLICT"].includes(e.code)) {
        const latest = await reloadMine();
        setProfile(latest);
        setEditing(e.code === "BUSINESS_PROFILE_ALREADY_EXISTS" || !latest);
        const message = e.code === "BUSINESS_PROFILE_VERSION_CONFLICT" ? "Hồ sơ đã được cập nhật ở thiết bị khác" : "Hồ sơ đã tồn tại. Bạn có thể chỉnh sửa dữ liệu mới nhất.";
        setNotice(message);
        openSnackbar({ text: message, type: "warning" });
        return;
      }
      if (e instanceof ApiRequestError && e.status === 404 && e.code === "BUSINESS_PROFILE_NOT_FOUND") {
        setProfile(null);
        setEditing(true);
        setNotice("Hồ sơ không còn tồn tại. Bạn có thể tạo lại hồ sơ.");
        return;
      }
      await checkAccess(e);
      throw e;
    }
  }
  async function remove() {
    if (!userId || deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    try {
      await request((token) => deleteBusinessProfile(token, userId));
      setProfile(null); setEditing(true); setConfirmDelete(false); setNotice("");
      openSnackbar({ text: "Đã xóa hồ sơ công khai", type: "success" });
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 404 && e.code === "BUSINESS_PROFILE_NOT_FOUND") {
        setProfile(null); setEditing(true); setConfirmDelete(false);
      } else {
        openSnackbar({ text: getApiErrorMessage(e), type: "error" });
        try { await checkAccess(e); } catch (accessError) { setError(getApiErrorMessage(accessError)); }
      }
    } finally { deleteLock.current = false; setDeleting(false); }
  }
  const businessType = profile?.businessType ?? auth.user?.businessType;
  return <BusinessProfileShell title="Hồ sơ cơ sở">
    <main className="trade-flow__content business-profile-content">
      {role !== "BUSINESS" ? <section className="trade-flow__status-card">
        <h2>Cần tài khoản BUSINESS đã được duyệt</h2>
        {auth.user ? <button type="button" onClick={() => navigate("/business/register")}>Đăng ký BUSINESS</button> : <button type="button" disabled={auth.status === "loading"} onClick={() => void auth.authenticate().catch((e) => setError(getApiErrorMessage(e)))}>Đăng nhập Zalo</button>}
        {error && <p role="alert">{error}</p>}
      </section> : loading || error ? <ProfileState loading={loading} error={error} onRetry={() => setRevision((value) => value + 1)} /> : <>
        {notice && <p role="status" className="business-profile-notice">{notice}</p>}
        {!isBusinessType(businessType) ? <ProfileState error="Chưa xác định được loại hình đã duyệt. Vui lòng tải lại thông tin tài khoản." onRetry={() => void auth.refreshUser().then(() => setRevision((value) => value + 1)).catch((e) => setError(getApiErrorMessage(e)))} /> : editing || !profile ?
          <BusinessProfileForm key={`${userId}:${businessType}:${profile?.id ?? "new"}:${profile?.version ?? 0}`} profile={profile} businessType={businessType} onSave={save} onCancel={profile ? () => setEditing(false) : undefined} /> : <>
            <BusinessProfileView profile={profile} onEdit={() => setEditing(true)} onDelete={() => setConfirmDelete(true)} />
          </>}
      </>}
    </main>
    <Modal visible={confirmDelete} title="Xóa hồ sơ cơ sở?" description="Hồ sơ sẽ biến mất khỏi trang công khai. Bạn có thể tạo lại hồ sơ sau khi xóa." maskClosable={!deleting} onClose={() => { if (!deleting) setConfirmDelete(false); }} actionsDivider actions={[
      { key: "cancel", text: "Hủy", disabled: deleting, onClick: () => setConfirmDelete(false) },
      { key: "delete", text: deleting ? "Đang xóa..." : "Xác nhận xóa", danger: true, highLight: true, disabled: deleting, onClick: () => void remove() },
    ]} />
  </BusinessProfileShell>;
}
