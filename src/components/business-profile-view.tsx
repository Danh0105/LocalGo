import { useRef, useState, type ReactNode } from "react";
import { Page, useNavigate, useSnackbar } from "zmp-ui";
import { ArrowLeft, ArrowUpRight, Building2, ChevronRight, CircleAlert, ExternalLink, Globe2, Info, Mail, MapPin, Pencil, Phone, RefreshCw, Store, Trash2, UserRound, EyeOff } from "lucide-react";
import DirectionsButton from "@/components/directions-button";
import { getApiBaseUrl } from "@/config/api";
import { businessTypeFields, isHttpUrl } from "@/lib/business-profile-form";
import { callPhone, composeEmail } from "@/utils/contact";
import { BUSINESS_TYPE_LABELS, type BusinessProfile } from "@/types/business-profiles";
import "@/css/pages/trade.css";
import "@/css/pages/business-profiles.css";

function imageUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value, new URL(getApiBaseUrl()).origin).toString();
    return isHttpUrl(url) ? url : null;
  } catch { return null; }
}
export function ProfileImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const url = imageUrl(src);
  return url ? <img key={url} src={url} alt={alt} className={className} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : null;
}
export function ProfileAvatar({ name, src, className = "" }: { name: string; src: string | null; className?: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => Array.from(word)[0]).join("").toLocaleUpperCase("vi-VN");
  return <span className={`business-profile-avatar ${className}`}>
    <span aria-hidden="true">{initials || <Store size={28} />}</span>
    <ProfileImage src={src} alt={`Logo ${name || "cơ sở"}`} />
  </span>;
}
export function BusinessProfileShell({ title, children, onRefresh }: { title: string; children: ReactNode; onRefresh?: () => void }) {
  const navigate = useNavigate();
  const touchStart = useRef<number | null>(null);
  return <Page className="trade-flow-page business-profiles-page" onTouchStart={(e) => {
    let node = e.target as HTMLElement | null;
    while (node && node !== e.currentTarget && node.scrollTop === 0) node = node.parentElement;
    touchStart.current = onRefresh && node === e.currentTarget && e.currentTarget.scrollTop <= 0 ? e.touches[0]?.clientY ?? null : null;
  }} onTouchEnd={(e) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (start !== null && (e.changedTouches[0]?.clientY ?? start) - start > 72) onRefresh?.();
  }}>
    <header className="business-profile-topbar"><div className="business-profile-topbar__inner">
      <button type="button" className="business-profile-icon-button" aria-label="Quay lại" onClick={() => navigate(-1)}><ArrowLeft size={21} /></button>
      <div className="business-profile-topbar__title"><span>LocalGo</span><h1>{title}</h1></div>
      {onRefresh ? <button type="button" className="business-profile-icon-button" aria-label="Làm mới" title="Làm mới" onClick={onRefresh}><RefreshCw size={19} /></button> : <Building2 className="business-profile-topbar__brand" size={24} aria-hidden="true" />}
    </div></header>
    {children}
  </Page>;
}
export function ProfileState({ loading, error, empty, onRetry }: { loading?: boolean; error?: string; empty?: string; onRetry?: () => void }) {
  return <div className="business-profile-state" role={error ? "alert" : "status"} aria-busy={loading}>
    {loading ? <><div className="business-profile-skeleton" /><div className="business-profile-skeleton business-profile-skeleton--line" /><span>Đang tải hồ sơ...</span></> : <>
      <span className={`business-profile-state__icon${error ? " is-error" : ""}`}>{error ? <CircleAlert size={28} /> : <Store size={28} />}</span>
      <p>{error || empty}</p>{error && onRetry && <button type="button" onClick={onRetry}><RefreshCw size={16} />Thử lại</button>}
    </>}
  </div>;
}
export function BusinessProfileCard({ profile }: { profile: BusinessProfile }) {
  const navigate = useNavigate();
  return <button type="button" className="business-profile-card" onClick={() => navigate(`/business-profiles/${encodeURIComponent(profile.id)}`)}>
    <div className="business-profile-card__header">
      <ProfileAvatar name={profile.businessName} src={profile.logoUrl} />
      <div><h2>{profile.businessName}</h2><span>{BUSINESS_TYPE_LABELS[profile.businessType]}<span aria-hidden="true"> · </span><Globe2 size={12} aria-hidden="true" /></span></div>
      <ChevronRight size={19} className="business-profile-card__arrow" aria-hidden="true" />
    </div>
    <div className={`business-profile-cover business-profile-cover--${profile.businessType.toLowerCase()} business-profile-card__cover`}>
      <Store className="business-profile-cover__motif" size={72} strokeWidth={1} aria-hidden="true" />
      <ProfileImage src={profile.coverImageUrl} alt="" />
      <span className="business-profile-card__category">{profile.businessCategory || BUSINESS_TYPE_LABELS[profile.businessType]}</span>
    </div>
    <div className="business-profile-card__body">
      {profile.description && <p className="business-profile-card__description">{profile.description}</p>}
      <p className="business-profile-card__address"><MapPin size={16} aria-hidden="true" />{profile.address}</p>
      <div className="business-profile-card__facts">{businessTypeFields[profile.businessType]?.map(({ name, label }) => {
        const value = profile[name as keyof BusinessProfile];
        return value != null && value !== "" ? <span key={name}>{label}: {String(value)}</span> : null;
      })}</div>
      <span className="business-profile-card__footer">Khám phá cơ sở<span>Xem hồ sơ <ArrowUpRight size={16} aria-hidden="true" /></span></span>
    </div>
  </button>;
}
export default function BusinessProfileView({ profile, onEdit, onDelete }: { profile: BusinessProfile; onEdit?: () => void; onDelete?: () => void }) {
  const { openSnackbar } = useSnackbar();
  const [activeSection, setActiveSection] = useState("intro");
  const introRef = useRef<HTMLElement>(null);
  const infoRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const mapsUrl = profile.googleMapsUrl || (profile.lat != null && profile.lng != null ? `https://www.google.com/maps/search/?api=1&query=${profile.lat},${profile.lng}` : null);
  const call = () => void callPhone(profile.contactPhone).catch((e) => openSnackbar({ text: e.message, type: "error" }));
  return <article className="business-profile-view">
    <div className="business-profile-hero">
      <div className={`business-profile-cover business-profile-cover--${profile.businessType.toLowerCase()}`}>
        <Store className="business-profile-cover__motif" size={110} strokeWidth={.8} aria-hidden="true" />
        <ProfileImage src={profile.coverImageUrl} alt="" />
      </div>
      <div className="business-profile-hero__identity">
        <ProfileAvatar name={profile.businessName} src={profile.logoUrl} />
        <span className="business-profile-hero__kind"><Store size={13} />{BUSINESS_TYPE_LABELS[profile.businessType]}</span>
        <h2>{profile.businessName}</h2>
        <p>{profile.businessCategory || "Kết nối cùng cộng đồng địa phương"}</p>
        <span className="business-profile-hero__visibility">{profile.isPublic ? <><Globe2 size={13} />Trang cơ sở công khai</> : <><EyeOff size={13} />Hồ sơ riêng tư</>}</span>
        <div className="business-profile-actions business-profile-hero__actions">
          {onEdit ? <button type="button" className="is-primary" onClick={onEdit}><Pencil size={16} />Chỉnh sửa hồ sơ</button> : profile.contactPhone && <button type="button" className="is-primary" onClick={call}><Phone size={16} />Gọi điện</button>}
          <DirectionsButton googleMapsUrl={mapsUrl} label="Mở Google Maps" />
        </div>
      </div>
      <nav className="business-profile-tabs" aria-label="Các phần hồ sơ">
        {([{ key: "intro", label: "Giới thiệu", ref: introRef }, { key: "info", label: "Thông tin", ref: infoRef }, { key: "contact", label: "Liên hệ", ref: contactRef }]).map(({ key, label, ref }) => <button key={key} type="button" aria-current={activeSection === key ? "location" : undefined} onClick={() => { setActiveSection(key); ref.current?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); }}>{label}</button>)}
      </nav>
    </div>
    <div className="business-profile-sections">
      <section ref={introRef} className="business-profile-panel">
        <h3><Info size={18} />Giới thiệu</h3>
        {profile.description && <p className="business-profile-view__description">{profile.description}</p>}
        <p className="business-profile-intro-line"><Store size={17} /><span><strong>Trang</strong> · {BUSINESS_TYPE_LABELS[profile.businessType]}</span></p>
        {profile.businessCategory && <p className="business-profile-intro-line"><Building2 size={17} /><span>{profile.businessCategory}</span></p>}
        {profile.address && <p className="business-profile-intro-line"><MapPin size={17} /><span>{profile.address}</span></p>}
      </section>
      <section ref={infoRef} className="business-profile-panel">
        <h3><Building2 size={18} />Thông tin cơ sở</h3>
        <dl>{[
          { name: "businessCategory", label: "Ngành nghề" },
          ...(businessTypeFields[profile.businessType] ?? []),
          { name: "contactName", label: "Người liên hệ" },
        ].map(({ name, label }) => {
          const value = profile[name as keyof BusinessProfile];
          return value != null && value !== "" ? <div key={name}><dt>{label}</dt><dd>{name === "contactName" && <UserRound size={15} />}{String(value)}</dd></div> : null;
        })}</dl>
      </section>
      <section ref={contactRef} className="business-profile-panel">
        <h3><Phone size={18} />Kết nối với cơ sở</h3>
        <div className="business-profile-contact-list">
          {profile.contactPhone && <button type="button" aria-label={onEdit ? "Gọi điện" : `Gọi ${profile.contactPhone}`} onClick={call}><span className="business-profile-contact-icon"><Phone size={19} /></span><span><small>Điện thoại</small><strong>{profile.contactPhone}</strong></span><ArrowUpRight size={17} /></button>}
          {profile.contactEmail && <button type="button" aria-label="Gửi email" onClick={() => { try { composeEmail(profile.contactEmail, profile.businessName); } catch { openSnackbar({ text: "Email không hợp lệ.", type: "error" }); } }}><span className="business-profile-contact-icon"><Mail size={19} /></span><span><small>Email</small><strong>{profile.contactEmail}</strong></span><ArrowUpRight size={17} /></button>}
          {[["Website", profile.website], ["Facebook", profile.facebookUrl], ["Zalo OA", profile.zaloOaUrl]].map(([label, url]) => isHttpUrl(url) ? <a key={label} aria-label={label!} href={url} target="_blank" rel="noopener noreferrer"><span className="business-profile-contact-icon"><Globe2 size={19} /></span><span><small>{label}</small><strong>{new URL(url).hostname.replace(/^www\./, "")}</strong></span><ExternalLink size={16} /></a> : null)}
        </div>
      </section>
      {onDelete && <section className="business-profile-panel business-profile-owner-tools"><div><h3>Quản lý hồ sơ</h3><p>Quản lý sự hiện diện của cơ sở trên LocalGo.</p></div><button type="button" onClick={onDelete}><Trash2 size={16} />Xóa hồ sơ</button></section>}
    </div>
  </article>;
}
