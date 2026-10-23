import { useEffect, useRef, useState, type FormEvent } from "react";
import { Page, useLocation, useNavigate } from "zmp-ui";
import { ArrowLeft, LogIn } from "lucide-react";
import { useCurrentUser } from "@/contexts/auth-context";
import PasswordField from "@/components/password-field";
import "@/css/pages/password-security.css";

export default function LoginPage() {
  const auth = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => { if (location.pathname !== "/login") setPassword(""); }, [location.pathname]);
  const login = async (event?: FormEvent) => {
    event?.preventDefault();
    if (pending.current) return;
    if (event && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password)) { setError("Vui lòng nhập email hợp lệ và mật khẩu."); return; }
    pending.current = true; setBusy(true); setError("");
    try {
      if (event) await auth.loginEmail(email.trim(), password);
      else await auth.authenticate({ allowAfterForcedLogout: true });
      navigate("/", { replace: true });
    } catch {
      setError(event ? "Không thể đăng nhập. Vui lòng kiểm tra email, mật khẩu hoặc thử lại sau." : "Không thể đăng nhập Zalo. Vui lòng thử lại.");
    } finally { setPassword(""); setBusy(false); pending.current = false; }
  };
  return <Page className="security-page">
    <header className="security-header"><button aria-label="Quay lại trang chủ" onClick={() => navigate("/", { replace: true })}><ArrowLeft size={22} /></button><h1>Đăng nhập</h1></header>
    <main className="security-card"><span className="security-emblem"><LogIn size={28} /></span><h2>Chào mừng đến LocalGo</h2><p>Đăng nhập tài khoản bằng email hoặc tiếp tục với Zalo.</p>
      {error && <p role="alert" className="security-error">{error}</p>}
      <form onSubmit={(event) => void login(event)} noValidate>
        <div className="security-field"><label htmlFor="login-email">Email</label><input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></div>
        <PasswordField name="login-password" label="Mật khẩu" current value={password} onChange={setPassword} disabled={busy} />
        <button className="security-link" type="button" disabled={busy} onClick={() => navigate("/forgot-password")}>Quên mật khẩu?</button>
        <button className="security-primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
      </form>
      <button className="security-secondary" disabled={busy} onClick={() => void login()}>Tiếp tục với Zalo</button>
    </main>
  </Page>;
}
