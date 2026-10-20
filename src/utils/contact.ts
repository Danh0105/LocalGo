
import { openPhone } from "zmp-sdk/apis";

/**
 * Mở màn hình gọi điện Android / iOS.
 */
export async function callPhone(
  phone: string
): Promise<void> {
  const phoneNumber = phone
    .trim()
    .replace(/[^\d+]/g, "");

  if (!/^\+?\d{8,15}$/.test(phoneNumber)) {
    throw new Error("Số điện thoại không hợp lệ");
  }

  try {
    // API chính thức của Zalo Mini App
    await openPhone({ phoneNumber });
  } catch {
    // Fallback khi chạy trên trình duyệt thông thường.
    // Khả năng mở ứng dụng phụ thuộc WebView.
    window.location.href = `tel:${phoneNumber}`;
  }
}

/**
 * Mở ứng dụng email mặc định.
 * Không tự động gửi email.
 */
export function composeEmail(
  email: string,
  placeName: string
): void {
  const recipient = email.trim();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
  ) {
    throw new Error("Địa chỉ email không hợp lệ");
  }

  const subject = `Liên hệ về ${placeName}`;

  const body =
    `Xin chào,\n\n` +
    `Tôi muốn tìm hiểu thêm thông tin về ${placeName}.\n\n` +
    `Xin cảm ơn!`;

  const url =
    `mailto:${recipient}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.location.href = url;
}
