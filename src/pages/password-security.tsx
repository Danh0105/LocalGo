import { useEffect, useRef, useState, type FormEvent } from "react";
import { Page, useLocation, useNavigate, useSnackbar } from "zmp-ui";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import PasswordField, { PasswordChecklist } from "@/components/password-field";
import { useCurrentUser } from "@/contexts/auth-context";
import { ApiRequestError } from "@/lib/http-client";
import { changePassword, forgotPassword, resetPassword, validatePassword, isGardenAccount, FORGOT_PASSWORD_MESSAGE, type PasswordErrors } from "@/services/password";
import "@/css/pages/password-security.css";

type Mode = "change" | "forgot" | "reset";
export default function PasswordSecurityPage({ mode }: { mode: "forgot" | "reset" }) {
  return <PasswordSecurityContent mode={mode} />;
}
export function ChangePasswordPanel({ onClose, onForbidden }: { onClose: () => void; onForbidden?: () => void }) {
  return <PasswordSecurityContent mode="change" onClose={onClose} onForbidden={onForbidden} />;
}
function PasswordSecurityContent({ mode, onClose, onForbidden }: { mode: Mode; onClose?: () => void; onForbidden?: () => void }) {
  const auth = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { openSnackbar } = useSnackbar();
  // A ref retains the opaque secret across URL replacement, without persisting it.
  const token = useRef<string | null>(null);
  const tokenRead = useRef(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [fields, setFields] = useState({ currentPassword: "", newPassword: "", newPasswordConfirmation: "" });
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [verifiedGarden, setVerifiedGarden] = useState(false);
  const pending = useRef(false);
  const alive = useRef(true);
  const clearPasswords = () => setFields({ currentPassword: "", newPassword: "", newPasswordConfirmation: "" });
  useEffect(() => {
    if (!busy && errors.currentPassword) document.getElementById("currentPassword")?.focus();
  }, [busy, errors.currentPassword]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; token.current = null; tokenRead.current = false; };
  }, []);
  useEffect(() => {
    if (mode !== "reset" || tokenRead.current) return;
    tokenRead.current = true;
    const params = new URLSearchParams(location.search);
    token.current = params.get("token");
    params.delete("token");
    navigate(`${location.pathname}${params.size ? `?${params}` : ""}`, { replace: true });
    setTokenReady(true);
  }, [mode, location.pathname, location.search, navigate]);
  useEffect(() => {
    if (mode !== "change") return;
    if (auth.status === "loading") return;
    if (!auth.accessToken) { navigate("/login", { replace: true }); return; }
    let active = true;
    void auth.refreshUser().then((user) => {
      if (!active) return;
      if (isGardenAccount(user)) setVerifiedGarden(true);
      else { openSnackbar({ text: "Chức năng chỉ dành cho Chủ vườn.", type: "error" }); onForbidden?.(); onClose?.(); }
    }).catch(() => { if (active) setMessage("Không thể xác minh tài khoản. Vui lòng đăng nhập lại."); });
    return () => { active = false; };
    // Verify against the API on entry, never infer the account type from cached profile data.
  }, [mode, auth.accessToken, auth.status]);

  useEffect(() => {
    const expectedPath = mode === "change" ? "/business/profile" : mode === "forgot" ? "/forgot-password" : "/reset-password";
    if (location.pathname !== expectedPath) { clearPasswords(); token.current = null; }
  }, [location.pathname, mode]);

  const update = (name: keyof typeof fields, value: string) => {
    setFields((old) => ({ ...old, [name]: value }));
    setErrors((old) => ({ ...old, [name]: undefined }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    const validation = mode === "forgot" ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? {} : { email: "Vui lòng nhập email hợp lệ." }) : validatePassword(mode === "change" ? fields : { newPassword: fields.newPassword, newPasswordConfirmation: fields.newPasswordConfirmation });
    setErrors(validation);
    if (Object.keys(validation).length) return;
    if (mode === "change" && (!verifiedGarden || !isGardenAccount(auth.user) || !auth.accessToken)) return;
    if (mode === "reset" && !token.current) return;
    pending.current = true;
    setBusy(true); setMessage("");
    let retainFields = false;
    const safeMessage = (value: string) => {
      let safe = value;
      for (const secret of [...Object.values(fields), token.current]) if (secret) safe = safe.split(secret).join("••••");
      return safe;
    };
    try {
      if (mode === "forgot") {
        await forgotPassword(email.trim());
        if (alive.current) setSent(true);
      } else {
        if (mode === "change") await changePassword(auth.accessToken!, fields);
        else await resetPassword(token.current!, fields);
        token.current = null;
        clearPasswords();
        auth.forceLogout();
        openSnackbar({ text: `${mode === "change" ? "Đổi" : "Đặt lại"} mật khẩu thành công. Vui lòng đăng nhập lại.`, type: "success" });
        navigate("/login", { replace: true });
      }
    } catch (error) {
      if (!alive.current) return;
      const request = error instanceof ApiRequestError ? error : null;
      const code = request?.code;
      retainFields = code === "VALIDATION_ERROR" || code === "PASSWORD_CONFIRMATION_MISMATCH" || code === "CURRENT_PASSWORD_INVALID" || request?.status === 429;
      if (code === "CURRENT_PASSWORD_INVALID") {
        setErrors({ currentPassword: "Mật khẩu hiện tại không đúng." });
        document.getElementById("currentPassword")?.focus();
      } else if (code === "PASSWORD_CONFIRMATION_MISMATCH") setErrors({ newPasswordConfirmation: "Xác nhận mật khẩu mới không trùng khớp." });
      else if (code === "VALIDATION_ERROR" && Array.isArray(request?.details)) {
        const mapped: PasswordErrors = {};
        for (const item of request.details) {
          const field = item?.field ?? item?.property ?? item?.path;
          const detailMessage = item?.message ?? item?.messages?.[0] ?? Object.values(item?.constraints ?? {})[0];
          if (["currentPassword", "newPassword", "newPasswordConfirmation", "email"].includes(field)) mapped[field as keyof PasswordErrors] = typeof detailMessage === "string" ? safeMessage(detailMessage) : "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.";
        }
        setErrors(mapped);
        if (!Object.keys(mapped).length) setMessage(safeMessage(request?.message || "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại."));
      } else if (code === "GARDEN_ACCOUNT_REQUIRED") {
        clearPasswords(); setVerifiedGarden(false);
        openSnackbar({ text: "Chức năng chỉ dành cho Chủ vườn.", type: "error" }); onForbidden?.(); onClose?.();
      } else if (code === "INVALID_PASSWORD_RESET_TOKEN") {
        token.current = null; setInvalidToken(true);
        setMessage("Liên kết không hợp lệ hoặc đã hết hạn.");
      } else if (request?.status === 401 && mode === "change") {
        auth.forceLogout(); navigate("/login", { replace: true });
      } else if (request?.status === 429) setMessage("Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.");
      else if (mode === "forgot") setMessage("Không thể gửi hướng dẫn. Vui lòng thử lại sau.");
      else {
        // Never show submitted secrets even if a server validation message echoes them.
        setMessage(safeMessage(request?.message || "Không thể hoàn tất yêu cầu. Vui lòng thử lại."));
      }
    } finally {
      pending.current = false;
      if (alive.current) { setBusy(false); if (!retainFields) clearPasswords(); }
    }
  };
  const title = mode === "change" ? "Đổi mật khẩu" : mode === "forgot" ? "Quên mật khẩu" : "Đặt lại mật khẩu";
  const missingToken = mode === "reset" && tokenReady && !token.current;
  const Container = mode === "change" ? "div" : Page;
  const Content = mode === "change" ? "div" : "main";
  return <Container className={mode === "change" ? "security-embedded" : "security-page"}>
    {mode !== "change" && <header className="security-header"><button type="button" aria-label="Quay lại" onClick={() => navigate("/login", { replace: true })}><ArrowLeft size={22} /></button><h1>{title}</h1></header>}
    <Content className={mode === "change" ? "security-inline-form" : "security-card"}>
      <span className="security-emblem"><ShieldCheck size={28} /></span>
      <h2>{title}</h2>
      {mode === "change" && <p>Mật khẩu này dùng để đăng nhập tài khoản Chủ vườn trên các giao diện LocalGo hỗ trợ đăng nhập bằng email.</p>}
      {mode === "forgot" && <p>Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu.</p>}
      {message && <p role="alert" className="security-error">{message}</p>}
      {sent ? <div role="status"><p>{FORGOT_PASSWORD_MESSAGE}</p><button className="security-primary" onClick={() => navigate("/login", { replace: true })}>Quay lại đăng nhập</button></div>
        : (missingToken || invalidToken) ? <><p role="alert">{invalidToken ? "Vui lòng yêu cầu liên kết mới." : "Liên kết đặt lại mật khẩu không hợp lệ"}</p><button className="security-primary" onClick={() => navigate("/forgot-password", { replace: true })}>{invalidToken ? "Gửi lại liên kết" : "Yêu cầu liên kết mới"}</button></>
        : mode === "change" && !verifiedGarden ? message ? <button className="security-primary" onClick={() => navigate("/login", { replace: true })}>Quay lại đăng nhập</button> : <p role="status">Đang xác minh tài khoản Chủ vườn…</p>
        : <form onSubmit={(event) => void submit(event)} noValidate>
          {mode === "forgot" ? <div className="security-field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />{errors.email && <p id="email-error" className="security-error" role="alert">{errors.email}</p>}</div> : <>
            {mode === "change" && <PasswordField name="currentPassword" label="Mật khẩu hiện tại" current value={fields.currentPassword} onChange={(value) => update("currentPassword", value)} error={errors.currentPassword} disabled={busy} />}
            <PasswordField name="newPassword" label="Mật khẩu mới" value={fields.newPassword} onChange={(value) => update("newPassword", value)} error={errors.newPassword} disabled={busy} />
            <PasswordChecklist value={fields.newPassword} />
            <PasswordField name="newPasswordConfirmation" label="Xác nhận mật khẩu mới" value={fields.newPasswordConfirmation} onChange={(value) => update("newPasswordConfirmation", value)} error={errors.newPasswordConfirmation} disabled={busy} />
          </>}
          <button className="security-primary" type="submit" disabled={busy || (mode === "reset" && !tokenReady)} aria-busy={busy}>{busy ? "Đang xử lý…" : mode === "change" ? "Đổi mật khẩu" : mode === "forgot" ? "Gửi hướng dẫn" : "Đặt lại mật khẩu"}</button>
        </form>}
      {mode === "change" && <button type="button" className="security-secondary" disabled={busy} onClick={() => { clearPasswords(); onClose?.(); }}>Đóng form đổi mật khẩu</button>}
    </Content>
  </Container>;
}
