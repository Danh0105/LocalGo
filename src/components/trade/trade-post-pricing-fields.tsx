import type { TradePostPriceType } from "@/services/trade-posts";

interface Props {
  nonProfit: boolean;
  priceType: TradePostPriceType;
  onPriceTypeChange: (value: TradePostPriceType) => void;
  price?: string | null;
  priceLabel?: string | null;
  eventEndAt?: string | null;
}

function localDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
}

export default function TradePostPricingFields({
  nonProfit,
  priceType,
  onPriceTypeChange,
  price,
  priceLabel,
  eventEndAt,
}: Props) {
  if (nonProfit)
    return (
      <>
        <p className="trade-create__section-description">
          <strong>Tin phi lợi nhuận</strong> · Tin hoạt động cộng đồng không có
          thông tin giá.
        </p>
        <label>
          <span className="trade-flow__label-text">
            Kết thúc sự kiện <small>Không bắt buộc</small>
          </span>
          <input
            name="eventEndAt"
            type="datetime-local"
            defaultValue={localDateTime(eventEndAt)}
          />
          <small>
            Nếu không đặt ngày hết hạn riêng, tin sẽ ngừng hiển thị khi sự kiện
            kết thúc.
          </small>
        </label>
      </>
    );

  return (
    <>
      <label>
        <span className="trade-flow__label-text">
          Hình thức giá <i aria-hidden="true">*</i>
        </span>
        <select
          name="priceType"
          value={priceType}
          onChange={(event) =>
            onPriceTypeChange(event.target.value as TradePostPriceType)
          }
        >
          <option value="CONTACT">Liên hệ báo giá</option>
          <option value="NEGOTIABLE">Thỏa thuận</option>
          <option value="FIXED">Giá cố định</option>
        </select>
      </label>
      {priceType === "FIXED" && (
        <label>
          <span className="trade-flow__label-text">
            Giá (VNĐ) <i aria-hidden="true">*</i>
          </span>
          <input
            name="price"
            type="number"
            min="1"
            step="1000"
            inputMode="numeric"
            defaultValue={price ?? ""}
            placeholder="Ví dụ: 500000"
            required
          />
        </label>
      )}
      <label>
        <span className="trade-flow__label-text">
          Nhãn giá <small>Không bắt buộc</small>
        </span>
        <input
          name="priceLabel"
          maxLength={100}
          defaultValue={priceLabel ?? ""}
          placeholder="Ví dụ: Liên hệ báo giá"
        />
      </label>
    </>
  );
}
