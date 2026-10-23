import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({ name, label, value, onChange, error, current = false, disabled = false }: {
  name: string; label: string; value: string; onChange: (value: string) => void; error?: string; current?: boolean; disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return <div className="security-field">
    <label htmlFor={name}>{label}</label>
    <div className="security-password">
      <input id={name} name={name} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={current ? "current-password" : "new-password"} autoCapitalize="none" spellCheck={false} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} required />
      <button type="button" aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`} aria-controls={name} aria-pressed={visible} onClick={() => setVisible(!visible)} disabled={disabled}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}<span>{visible ? "Ẩn" : "Hiện"}</span></button>
    </div>
    {error && <p id={`${name}-error`} className="security-error" role="alert">{error}</p>}
  </div>;
}
export function PasswordChecklist({ value }: { value: string }) {
  return <ul className="security-checklist" aria-label="Yêu cầu mật khẩu">
    <li data-met={value.length >= 8 && value.length <= 128}>8–128 ký tự</li>
    <li data-met={/[\p{L}]/u.test(value) && /[0-9]/.test(value)}>Có chữ cái và chữ số</li>
  </ul>;
}
