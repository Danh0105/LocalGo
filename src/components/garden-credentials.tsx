import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Eye, EyeOff, KeyRound, Mail, Monitor, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "zmp-ui";
import { useCurrentUser } from "@/contexts/auth-context";
import { ApiRequestError } from "@/lib/http-client";
import type { CurrentUser } from "@/services/auth";
import { acknowledgeInitialGardenPassword, getGardenCredentials, initialGardenPasswordEnabled, issueInitialGardenPassword, type GardenCredentialsStatus } from "@/services/garden-credentials";
import { isGardenAccount } from "@/services/password";
import { ChangePasswordPanel } from "@/pages/password-security";
import type { BusinessProfile } from "@/types/business-profiles";
import "@/css/pages/password-security.css";

interface CredentialsLoad {
  user: CurrentUser;
  status: GardenCredentialsStatus | null;
  password: string | null;
  error: string;
}
export default function GardenCredentials({ profile }: { profile: BusinessProfile }) {
  const auth = useCurrentUser();
  const authRef = useRef(auth);
  authRef.current = auth;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [verified, setVerified] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<GardenCredentialsStatus | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);
  const entry = useRef(0);
  // Only an in-flight task is shared across effect replays; settled secrets are never cached.
  const work = useRef<Promise<CredentialsLoad | null> | null>(null);
  const [revision, setRevision] = useState(0);
  const eligible = isGardenAccount(auth.user) && profile.userId === auth.user?.id && profile.businessType === "GARDEN" && !profile.deletedAt && pathname === "/business/profile";

  useEffect(() => {
    if (!eligible) {
      entry.current += 1;
      setPassword(null); setVisible(false); setCopied(false); setChangeOpen(false); setVerified(null); setStatus(null);
      work.current = null;
      return;
    }
    let active = true;
    mounted.current = true;
    setLoading(true); setMessage("");
    if (!work.current) {
      const started = ++entry.current;
      work.current = (async () => {
      const user = await authRef.current.refreshUser();
      if (!mounted.current || started !== entry.current || !isGardenAccount(user) || user.id !== profile.userId) return null;
      try {
        const accessToken = authRef.current.accessToken;
        if (!accessToken) return null;
        const credentials = await getGardenCredentials(accessToken);
        if (!mounted.current || started !== entry.current) return null;
        const issued = credentials.canIssueInitialPassword && initialGardenPasswordEnabled()
          ? await issueInitialGardenPassword(authRef.current.accessToken ?? accessToken)
          : null;
        return { user, status: credentials, password: issued?.password ?? null, error: "" };
      } catch (error) {
        if (!mounted.current || started !== entry.current) return null;
        if (error instanceof ApiRequestError && error.status === 401) { authRef.current.forceLogout(); return null; }
        if (error instanceof ApiRequestError && error.status === 403) return null;
        if (error instanceof ApiRequestError && error.code === "INITIAL_PASSWORD_ALREADY_ACKNOWLEDGED") {
          const latest = await getGardenCredentials(authRef.current.accessToken!);
          return { user, status: latest, password: null, error: "" };
        }
        return { user, status: null, password: null, error: error instanceof ApiRequestError && error.status === 429 ? "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau." : "Thông tin cấp mật khẩu ban đầu chưa sẵn sàng. Bạn có thể dùng Quên mật khẩu để nhận hướng dẫn qua email." };
      }
      })();
    }
    void work.current.then((result) => {
      if (!active) return;
      work.current = null;
      setVerified(result?.user ?? null);
      setStatus(result?.status ?? null);
      setPassword(result?.password ?? null);
      setMessage(result?.error ?? "");
      setVisible(false); setCopied(false); setLoading(false);
    }).catch(() => {
      if (active) { work.current = null; setVerified(null); setLoading(false); }
    });
    return () => { active = false; mounted.current = false; };
  }, [eligible, profile.userId, profile.id, revision]);

  const acknowledge = async () => {
    if (pending.current || !password || !auth.accessToken) return;
    pending.current = true; setBusy(true); setMessage("");
    const started = entry.current;
    try {
      await acknowledgeInitialGardenPassword(auth.accessToken);
      if (!mounted.current || started !== entry.current) return;
      setPassword(null); setVisible(false); setCopied(false);
      setStatus((current) => current ? { ...current, passwordConfigured: true, initialPasswordAcknowledged: true, canIssueInitialPassword: false } : null);
    } catch (error) {
      if (!mounted.current || started !== entry.current) return;
      if (error instanceof ApiRequestError && error.status === 401) { setPassword(null); auth.forceLogout(); }
      else if (error instanceof ApiRequestError && error.status === 403) { setPassword(null); setVerified(null); }
      else if (error instanceof ApiRequestError && error.code === "INITIAL_PASSWORD_ALREADY_ACKNOWLEDGED") {
        setPassword(null); setVisible(false); setCopied(false); setRevision((value) => value + 1);
      } else setMessage(error instanceof ApiRequestError && error.status === 429 ? "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau." : "Chưa xác nhận được. Hãy giữ mật khẩu và thử lại.");
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const copyPassword = async () => {
    if (!password || busy || pending.current) return;
    const started = entry.current;
    try {
      await navigator.clipboard.writeText(password);
      if (mounted.current && started === entry.current) setCopied(true);
    } catch { if (mounted.current && started === entry.current) setMessage("Không thể sao chép. Bạn có thể bấm Hiện để lưu mật khẩu thủ công."); }
  };

  if (!eligible || (!loading && !verified)) return null;
  return <section className="business-profile-panel garden-credentials" aria-label="Thông tin đăng nhập">
    <h3><ShieldCheck size={18} />Thông tin đăng nhập</h3>
    {loading ? <p role="status">Đang tải thông tin đăng nhập…</p> : <>
      <p className="garden-credentials__description">Dùng email và mật khẩu này để đăng nhập LocalGo trên máy tính.</p>
      <a className="garden-credentials__desktop-link" href="https://localgo.skilltripx.com.vn/" target="_blank" rel="noopener noreferrer">
        <Monitor size={21} aria-hidden="true" />
        <span><strong>Đăng nhập trên máy tính</strong><span>https://localgo.skilltripx.com.vn/</span></span>
        <ExternalLink size={17} aria-hidden="true" />
      </a>
      <dl><div><dt><Mail size={15} />Email đăng nhập</dt><dd>{status?.email || verified?.email || "Chưa có email đăng nhập"}</dd></div></dl>
      {password ? <div className="garden-credentials__initial" role="region" aria-label="Mật khẩu đăng nhập của bạn">
        <h4><KeyRound size={18} />Mật khẩu đăng nhập của bạn</h4>
        <p className="garden-credentials__warning">Mật khẩu chỉ hiển thị ở bước này. Hãy lưu lại trước khi tiếp tục.</p>
        <p>Mở lại khi chưa xác nhận sẽ tạo mật khẩu mới; mật khẩu trước đó sẽ không còn dùng được.</p>
        <div className="garden-credentials__secret">
          <span className="garden-credentials__password" aria-label="Mật khẩu ban đầu">{visible ? password : "••••••••••••"}</span>
          <button type="button" aria-label={visible ? "Ẩn mật khẩu ban đầu" : "Hiện mật khẩu ban đầu"} aria-pressed={visible} disabled={busy} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}<span>{visible ? "Ẩn" : "Hiện"}</span></button>
        </div>
        <button type="button" className="security-secondary" disabled={busy} onClick={() => void copyPassword()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Đã sao chép" : "Sao chép mật khẩu"}</button>
        <button type="button" className="security-primary" disabled={busy} aria-busy={busy} onClick={() => void acknowledge()}>{busy ? "Đang xác nhận…" : "Tôi đã lưu mật khẩu"}</button>
      </div> : <>
        <dl><div><dt>Mật khẩu</dt><dd aria-label="Mật khẩu đã được bảo vệ">••••••••••••</dd></div></dl>
        {status?.canIssueInitialPassword && !initialGardenPasswordEnabled() && <p>Thông tin đăng nhập đang được chuẩn bị. Bạn có thể yêu cầu đặt lại mật khẩu qua email.</p>}
        {!changeOpen && status?.passwordConfigured !== false && <button type="button" className="security-primary" onClick={() => setChangeOpen(true)}><KeyRound size={17} />Đổi mật khẩu</button>}
        {changeOpen && <ChangePasswordPanel onClose={() => setChangeOpen(false)} onForbidden={() => setVerified(null)} />}
        <button type="button" className="security-link" onClick={() => navigate("/forgot-password")}>Quên mật khẩu?</button>
      </>}
      {message && <p className="security-error" role="alert">{message}</p>}
      {message && !password && <button type="button" className="security-secondary" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Thử lại</button>}
    </>}
  </section>;
}
