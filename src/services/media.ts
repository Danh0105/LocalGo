import type { UploadedMedia } from "@/data/content-images";
import { AuthRequestError } from "@/services/auth";

export const MAX_CONTENT_IMAGES = 10;
export const MAX_CONTENT_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://api.localgo.skilltripx.com.vn/api/v1";

export async function uploadContentImages(
  accessToken: string,
  files: readonly File[],
  signal?: AbortSignal
): Promise<UploadedMedia[]> {
  if (!files.length || files.length > MAX_CONTENT_IMAGES) {
    throw new Error("Mỗi lần chỉ được tải từ 1 đến 10 ảnh.");
  }
  if (files.some(file => !IMAGE_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_CONTENT_IMAGE_BYTES)) {
    throw new Error("Chỉ chấp nhận JPG, PNG, WebP có dung lượng tối đa 5 MB mỗi ảnh.");
  }
  const body = new FormData();
  files.forEach(file => body.append("files", file));
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/media/images/batch`, {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body, signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AuthRequestError("Không thể kết nối tới máy chủ.", 0);
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) {
    throw new AuthRequestError(result?.error?.message ?? "Không thể tải ảnh lên. Vui lòng thử lại.", response.status, result?.error?.code);
  }
  if (!Array.isArray(result.data) || result.data.length !== files.length
    || result.data.some((image: UploadedMedia) => !image?.id || !image.url)) {
    throw new Error("Máy chủ chưa trả đủ ảnh đã tải lên. Vui lòng thử lại.");
  }
  return result.data;
}
