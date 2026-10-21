import type { TradePostPurpose } from "@/services/business-applications";
import type { TradePostResponse } from "@/services/trade-posts";

export function getTradePostPurpose(
  businessType: string | null | undefined,
  purpose?: TradePostPurpose,
): TradePostPurpose {
  return businessType === "TEMPLE_MANAGEMENT"
    ? "NON_PROFIT"
    : (purpose ?? "COMMERCIAL");
}

export function formatTradePostPrice(
  post: Pick<
    TradePostResponse,
    "purpose" | "priceType" | "price" | "priceLabel"
  >,
): string {
  if (post.purpose === "NON_PROFIT") return "Phi lợi nhuận";
  if (post.priceLabel) return post.priceLabel;
  if (post.priceType === "NEGOTIABLE") return "Thỏa thuận";
  if (post.priceType === "CONTACT") return "Liên hệ báo giá";
  if (!post.price) return "Liên hệ";
  const price = Number(post.price);
  return Number.isFinite(price)
    ? `${new Intl.NumberFormat("vi-VN").format(price)}đ`
    : "Liên hệ";
}
