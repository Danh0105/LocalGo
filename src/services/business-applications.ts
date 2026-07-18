export type BusinessApplicantType = "INDIVIDUAL" | "ORGANIZATION";
export type BusinessApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type BusinessDocumentType =
  | "IDENTITY_FRONT"
  | "IDENTITY_BACK"
  | "BUSINESS_LICENSE"
  | "TAX_DOCUMENT"
  | "OTHER";

export interface BusinessApplicationDocument {
  id: string;
  name: string;
  type: BusinessDocumentType;
  url: string;
  mimeType: string;
}

export interface BusinessApplication {
  id: string;
  applicantType: BusinessApplicantType;
  businessName: string;
  businessCategory: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  identityNumber: string | null;
  identityIssuedAt: string | null;
  identityIssuedPlace: string | null;
  legalName: string | null;
  taxCode: string | null;
  representativeName: string | null;
  representativeTitle: string | null;
  website: string | null;
  description: string | null;
  zaloId: string | null;
  zaloDisplayName: string | null;
  zaloAvatarUrl: string | null;
  documents: BusinessApplicationDocument[];
  status: BusinessApplicationStatus;
  rejectionReason: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessApplicationPayload {
  applicantType: BusinessApplicantType;
  businessName: string;
  businessCategory: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  identityNumber?: string | null;
  identityIssuedAt?: string | null;
  identityIssuedPlace?: string | null;
  legalName?: string | null;
  taxCode?: string | null;
  representativeName?: string | null;
  representativeTitle?: string | null;
  website?: string | null;
  description?: string | null;
  zaloId: string;
  zaloDisplayName?: string | null;
  zaloAvatarUrl?: string | null;
  documents: Array<{
    mediaId: string;
    type: BusinessDocumentType;
    name: string;
  }>;
}

interface UploadedMedia {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  size: number;
  mimeType: string;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

export class BusinessApplicationError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "BusinessApplicationError";
    this.status = status;
    this.code = code;
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.localgo.skilltripx.com.vn/api/v1";

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });
  } catch {
    throw new BusinessApplicationError("Không thể kết nối tới máy chủ.", 0);
  }

  let body: ApiEnvelope<T> | ApiErrorEnvelope | undefined;
  try {
    body = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
  } catch {
    body = undefined;
  }

  if (!response.ok || !body?.success) {
    throw new BusinessApplicationError(
      body && !body.success
        ? body.error.message
        : "Không thể xử lý hồ sơ Business.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }

  return body.data;
}

export interface BusinessApplicationZaloCheck {
  exists: boolean;
  status: BusinessApplicationStatus | null;
}

export async function checkBusinessApplicationByZaloId(
  zaloId: string
): Promise<BusinessApplicationZaloCheck> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/business-applications/check?zaloId=${encodeURIComponent(zaloId)}`
    );
  } catch {
    throw new BusinessApplicationError("Không thể kết nối tới máy chủ.", 0);
  }

  let body: ApiEnvelope<BusinessApplicationZaloCheck> | ApiErrorEnvelope | undefined;
  try {
    body = (await response.json()) as
      | ApiEnvelope<BusinessApplicationZaloCheck>
      | ApiErrorEnvelope;
  } catch {
    body = undefined;
  }

  if (!response.ok || !body?.success) {
    throw new BusinessApplicationError(
      body && !body.success
        ? body.error.message
        : "Không thể kiểm tra hồ sơ Business theo Zalo ID.",
      response.status,
      body && !body.success ? body.error.code : undefined
    );
  }

  return body.data;
}

export async function getMyBusinessApplication(
  accessToken: string
): Promise<BusinessApplication | null> {
  try {
    return await request<BusinessApplication>(
      "/business-applications/me",
      accessToken
    );
  } catch (error) {
    if (
      error instanceof BusinessApplicationError &&
      error.status === 404
    ) {
      return null;
    }
    throw error;
  }
}

export function createBusinessApplication(
  accessToken: string,
  payload: BusinessApplicationPayload
): Promise<BusinessApplication> {
  return request<BusinessApplication>("/business-applications", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function resubmitBusinessApplication(
  accessToken: string,
  id: string,
  payload: BusinessApplicationPayload
): Promise<BusinessApplication> {
  return request<BusinessApplication>(
    `/business-applications/${encodeURIComponent(id)}`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function uploadBusinessDocument(
  accessToken: string,
  file: File
): Promise<UploadedMedia> {
  const body = new FormData();
  body.append("file", file);
  return request<UploadedMedia>("/media/images", accessToken, {
    method: "POST",
    body,
  });
}
