import { ApiRequestError } from "@/lib/http-client";
import { isValidGoogleMapsUrl } from "@/lib/google-maps-link";
import type { BusinessProfile, BusinessProfileInput, BusinessType } from "@/types/business-profiles";

export interface ProfileField { name: string; label: string; required?: boolean; type?: string }
export const commonProfileFields: ProfileField[] = [
  { name: "businessName", label: "Tên cơ sở", required: true },
  { name: "businessCategory", label: "Ngành nghề" },
  { name: "contactName", label: "Người liên hệ", required: true },
  { name: "contactPhone", label: "Số điện thoại", required: true, type: "tel" },
  { name: "contactEmail", label: "Email liên hệ", required: true, type: "email" },
  { name: "address", label: "Địa chỉ", required: true },
  { name: "googleMapsUrl", label: "Link Google Maps", type: "url" },
  { name: "lat", label: "Vĩ độ", type: "number" },
  { name: "lng", label: "Kinh độ", type: "number" },
  { name: "website", label: "Website", type: "url" },
  { name: "facebookUrl", label: "Facebook", type: "url" },
  { name: "zaloOaUrl", label: "Zalo OA", type: "url" },
  { name: "logoUrl", label: "URL logo", type: "url" },
  { name: "coverImageUrl", label: "URL ảnh bìa", type: "url" },
  { name: "description", label: "Giới thiệu" },
];
export const businessTypeFields: Record<BusinessType, ProfileField[]> = {
  TEMPLE_MANAGEMENT: [{ name: "templeName", label: "Tên đền/chùa/miếu", required: true }],
  RESTAURANT: [{ name: "openingHours", label: "Giờ mở cửa" }, { name: "seatingCapacity", label: "Số chỗ ngồi", type: "number" }],
  ACCOMMODATION: [{ name: "openingHours", label: "Giờ mở cửa" }, { name: "roomCount", label: "Số phòng", type: "number" }],
  GARDEN: [{ name: "gardenArea", label: "Diện tích vườn" }, { name: "mainProducts", label: "Sản phẩm chính", required: true }],
  GENERAL: [],
};
export function profileFormValues(profile: BusinessProfile | null, type: BusinessType): Record<string, string> {
  return Object.fromEntries([...commonProfileFields, ...businessTypeFields[type]].map(({ name }) => {
    const value = profile?.[name as keyof BusinessProfile];
    return [name, value == null ? "" : String(value)];
  }));
}
export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}
export function validateProfileForm(values: Record<string, string>, type: BusinessType): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of [...commonProfileFields, ...businessTypeFields[type]]) {
    const value = values[field.name]?.trim() || "";
    if (field.required && !value) errors[field.name] = `Vui lòng nhập ${field.label.toLowerCase()}.`;
    else if (value && field.type === "url" && !isHttpUrl(value)) errors[field.name] = "Nhập URL http hoặc https hợp lệ.";
  }
  if (values.contactPhone?.trim() && !/^(?:0[35789]\d{8}|02\d{9})$/.test(values.contactPhone.trim().replace(/^\+?84/, "0").replace(/[\s().-]/g, ""))) {
    errors.contactPhone = "Nhập số điện thoại Việt Nam hợp lệ.";
  }
  if (values.contactEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())) errors.contactEmail = "Email không hợp lệ.";
  if (values.googleMapsUrl?.trim() && !isValidGoogleMapsUrl(values.googleMapsUrl.trim())) errors.googleMapsUrl = "Nhập link Google Maps hợp lệ.";
  const lat = values.lat?.trim() || "";
  const lng = values.lng?.trim() || "";
  if (Boolean(lat) !== Boolean(lng)) errors[lat ? "lng" : "lat"] = "Nhập đủ cả vĩ độ và kinh độ.";
  for (const [name, value, max] of [["lat", lat, 90], ["lng", lng, 180]] as const) {
    if (value && (!Number.isFinite(Number(value)) || Math.abs(Number(value)) > max)) errors[name] = `Giá trị phải nằm trong khoảng -${max} đến ${max}.`;
  }
  for (const field of businessTypeFields[type].filter((item) => item.type === "number")) {
    const value = values[field.name]?.trim();
    if (value && (!Number.isSafeInteger(Number(value)) || Number(value) < 0)) errors[field.name] = "Nhập số nguyên không âm.";
  }
  return errors;
}
export function profileFormInput(values: Record<string, string>, type: BusinessType, isPublic: boolean): BusinessProfileInput {
  const entries = [...commonProfileFields, ...businessTypeFields[type]].map((field) => {
    const value = values[field.name]?.trim() || "";
    return [field.name, field.type === "number" ? value ? Number(value) : null : value || (field.required || field.name === "businessCategory" ? "" : null)];
  });
  return { ...Object.fromEntries(entries), isPublic } as BusinessProfileInput;
}

export function profileValidationErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiRequestError) || error.code !== "VALIDATION_ERROR") return {};
  const errors: Record<string, string> = {};
  const add = (field: string, message: unknown) => {
    const text = Array.isArray(message) ? message.join(" ") : message;
    if (typeof text === "string") errors[field] = text;
  };
  const parse = (details: unknown) => {
    if (Array.isArray(details)) {
      for (const detail of details) {
        if (detail && typeof detail === "object") {
          const field = detail.field ?? detail.path ?? detail.property;
          if (field) add(Array.isArray(field) ? field.join(".") : String(field), detail.message ?? detail.messages ?? Object.values(detail.constraints ?? {}));
        }
      }
    } else if (details && typeof details === "object") {
      const record = details as Record<string, unknown>;
      if (record.fieldErrors || record.errors) parse(record.fieldErrors ?? record.errors);
      else for (const [field, message] of Object.entries(record)) add(field, message);
    }
  };
  parse(error.details);
  return errors;
}
