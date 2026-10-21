import { useRef, useState, type FormEvent } from "react";
import { useSnackbar } from "zmp-ui";
import { Camera, Check, Globe2, ImagePlus, Info, MapPin, Phone, Save, ShieldCheck } from "lucide-react";
import { ProfileAvatar, ProfileImage } from "@/components/business-profile-view";
import { useAuthenticatedRequest } from "@/hooks/use-authenticated-request";
import { getApiBaseUrl } from "@/config/api";
import { getApiErrorMessage } from "@/lib/http-client";
import { businessTypeFields, commonProfileFields, profileFormInput, profileFormValues, profileValidationErrors, validateProfileForm, isHttpUrl } from "@/lib/business-profile-form";
import { uploadContentImages } from "@/services/media";
import { BUSINESS_TYPE_LABELS, type BusinessProfile, type BusinessProfileInput, type BusinessType } from "@/types/business-profiles";

export default function BusinessProfileForm({ profile, businessType, onSave, onCancel }: {
  profile: BusinessProfile | null;
  businessType: BusinessType;
  onSave: (value: BusinessProfileInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(() => profileFormValues(profile, businessType));
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const request = useAuthenticatedRequest();
  const { openSnackbar } = useSnackbar();

  async function upload(field: string, file?: File) {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const [media] = await request((token) => uploadContentImages(token, [file]));
      setValues((current) => ({ ...current, [field]: new URL(media.url, new URL(getApiBaseUrl()).origin).toString() }));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally { lock.current = false; setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const nextErrors = validateProfileForm(values, businessType);
    setErrors(nextErrors);
    setError("");
    if (Object.keys(nextErrors).length) return;
    lock.current = true;
    setBusy(true);
    try { await onSave(profileFormInput(values, businessType, isPublic)); }
    catch (e) {
      const message = getApiErrorMessage(e);
      setError(message);
      setErrors(profileValidationErrors(e));
      openSnackbar({ text: message, type: "error" });
    } finally { lock.current = false; setBusy(false); }
  }
  function renderField(field: (typeof commonProfileFields)[number]) {
    return <label key={field.name} className={`business-profile-field business-profile-field--${field.name}`}>
        <span>{field.label}{field.required && " *"}</span>
        {field.name === "description" ? <textarea name={field.name} value={values[field.name]} onChange={(e) => setValues((current) => ({ ...current, [field.name]: e.target.value }))} /> :
          <input name={field.name} type={field.type ?? "text"} step={field.name === "lat" || field.name === "lng" ? "any" : field.type === "number" ? "1" : undefined} required={field.required} value={values[field.name]} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `profile-error-${field.name}` : undefined} onChange={(e) => setValues((current) => ({ ...current, [field.name]: e.target.value }))} />}
        {errors[field.name] && <small role="alert" id={`profile-error-${field.name}`}>{errors[field.name]}</small>}
      </label>;
  }
  const fieldGroup = (names: string[]) => commonProfileFields.filter((field) => names.includes(field.name)).map(renderField);
  function uploadInput(field: "logoUrl" | "coverImageUrl") {
    return <input className="business-profile-sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void upload(field, file); }} />;
  }
  return <form className="business-profile-form" onSubmit={submit} noValidate>
    <header className="business-profile-editor-heading"><h2>{profile ? "Chỉnh sửa hồ sơ" : "Tạo hồ sơ cơ sở"}</h2><p>Một diện mạo chỉn chu, để khách hàng dễ dàng kết nối.</p></header>
    <fieldset disabled={busy}>
      <section className="business-profile-editor-appearance">
        <div className={`business-profile-cover business-profile-cover--${businessType.toLowerCase()}`}>
          {isHttpUrl(values.coverImageUrl) && <ProfileImage src={values.coverImageUrl} alt="Ảnh bìa xem trước" />}
          <label className="business-profile-cover-upload"><Camera size={16} /><span>Tải ảnh bìa</span>{uploadInput("coverImageUrl")}</label>
        </div>
        <div className="business-profile-editor-avatar">
          <ProfileAvatar name={values.businessName} src={values.logoUrl} />
          <label><Camera size={17} /><span className="business-profile-sr-only">Tải logo</span>{uploadInput("logoUrl")}</label>
        </div>
        <div className="business-profile-editor-appearance__caption"><strong>Ảnh đại diện & ảnh bìa</strong><p>Chọn ảnh rõ nét để cơ sở dễ nhận diện.</p></div>
        <details className="business-profile-image-links"><summary><ImagePlus size={15} />Dùng đường dẫn hình ảnh</summary><div className="business-profile-form-grid">{fieldGroup(["logoUrl", "coverImageUrl"])}</div></details>
      </section>
      <section className="business-profile-panel"><h3><Info size={18} />Thông tin cơ bản</h3><div className="business-profile-form-grid">{fieldGroup(["businessName", "businessCategory", "description"])}</div></section>
      <section className="business-profile-panel"><h3><ShieldCheck size={18} />Loại hình cơ sở</h3><p className="business-profile-editor-type">Loại hình đã duyệt: {BUSINESS_TYPE_LABELS[businessType]}</p><div className="business-profile-form-grid">{businessTypeFields[businessType].map(renderField)}</div></section>
      <section className="business-profile-panel"><h3><Phone size={18} />Thông tin liên hệ</h3><div className="business-profile-form-grid">{fieldGroup(["contactName", "contactPhone", "contactEmail"])}</div></section>
      <section className="business-profile-panel"><h3><MapPin size={18} />Địa chỉ & bản đồ</h3><div className="business-profile-form-grid">{fieldGroup(["address", "googleMapsUrl", "lat", "lng"])}</div></section>
      <section className="business-profile-panel"><h3><Globe2 size={18} />Kênh trực tuyến</h3><div className="business-profile-form-grid">{fieldGroup(["website", "facebookUrl", "zaloOaUrl"])}</div></section>
      <section className="business-profile-panel business-profile-publishing"><span className="business-profile-publishing__icon"><Globe2 size={23} /></span><label className="business-profile-form__checkbox"><span><strong>Công khai hồ sơ</strong><small>Cho phép mọi người tìm thấy cơ sở của bạn.</small></span><span className="business-profile-switch"><input type="checkbox" checked={isPublic} aria-label="Công khai hồ sơ" onChange={(e) => setIsPublic(e.target.checked)} /><span aria-hidden="true"><Check size={12} /></span></span></label></section>
      {error && <p role="alert">{error}</p>}
      <div className="business-profile-actions business-profile-editor-footer">
        {onCancel && <button type="button" className="is-secondary" onClick={onCancel}>Hủy chỉnh sửa</button>}
        <button type="submit" className="is-primary" disabled={busy}><Save size={17} />{busy ? "Đang xử lý..." : "Lưu hồ sơ"}</button>
      </div>
    </fieldset>
  </form>;
}
