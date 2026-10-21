import { FormEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { useDialog } from "@/hooks/use-dialog";
import {
  EMPTY_TRADE_FILTERS,
  type SectionTradeFilters,
} from "@/hooks/use-section-trade-posts";
import type { TradePostCategoryInfo } from "@/services/trade-posts";

const priceRanges = [
  { label: "Dưới 100.000đ", min: undefined, max: 100000 },
  { label: "100.000–500.000đ", min: 100000, max: 500000 },
  { label: "Trên 500.000đ", min: 500000, max: undefined },
];

export default function SectionTradeFilterSheet({
  filters,
  categories,
  nonProfit,
  onApply,
  onClose,
}: {
  filters: SectionTradeFilters;
  categories: TradePostCategoryInfo[];
  nonProfit: boolean;
  onApply: (filters: SectionTradeFilters) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(filters.category);
  const [featured, setFeatured] = useState(filters.featured);
  const [min, setMin] = useState(filters.minPrice?.toString() ?? "");
  const [max, setMax] = useState(filters.maxPrice?.toString() ?? "");
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  useDialog(panel, onClose);

  function submit(event: FormEvent) {
    event.preventDefault();
    const minPrice = min.trim() ? Number(min) : undefined;
    const maxPrice = max.trim() ? Number(max) : undefined;
    if (
      !nonProfit &&
      ((minPrice !== undefined &&
        (!Number.isFinite(minPrice) || minPrice < 0)) ||
        (maxPrice !== undefined &&
          (!Number.isFinite(maxPrice) || maxPrice < 0)) ||
        (minPrice !== undefined &&
          maxPrice !== undefined &&
          minPrice > maxPrice))
    ) {
      setError(
        "Nhập khoảng giá hợp lệ, giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.",
      );
      return;
    }
    onApply({
      category,
      featured,
      ...(!nonProfit ? { minPrice, maxPrice } : {}),
    });
    onClose();
  }

  return createPortal(
    <div className="trade-filter-sheet">
      <div className="trade-filter-sheet__backdrop" onClick={onClose} />
      <div
        className="trade-filter-sheet__panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-filter-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <p>TÌM ĐÚNG ĐIỀU BẠN CẦN</p>
            <h2 id="trade-filter-title">Bộ lọc giao thương</h2>
          </div>
          <button
            type="button"
            className="trade-filter-sheet__close"
            aria-label="Đóng bộ lọc"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="trade-filter-sheet__body">
            <fieldset>
              <legend>Danh mục tin</legend>
              <div className="trade-filter-sheet__categories">
                {[{ code: "", name: "Tất cả danh mục" }, ...categories].map(
                  (item) => (
                    <label
                      key={item.code}
                      className={category === item.code ? "is-selected" : ""}
                    >
                      <input
                        type="radio"
                        name="trade-filter-category"
                        value={item.code}
                        checked={category === item.code}
                        onChange={() => setCategory(item.code)}
                      />
                      <span>{item.name}</span>
                      {category === item.code && <Check size={17} />}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            {!nonProfit && (
              <fieldset>
                <legend>Khoảng giá</legend>
                <p className="trade-filter-sheet__hint">
                  Chọn nhanh hoặc nhập mức giá bạn mong muốn.
                </p>
                <div className="trade-filter-sheet__presets">
                  {priceRanges.map((range) => (
                    <button
                      type="button"
                      key={range.label}
                      aria-pressed={
                        min === (range.min?.toString() ?? "") &&
                        max === (range.max?.toString() ?? "")
                      }
                      onClick={() => {
                        setMin(range.min?.toString() ?? "");
                        setMax(range.max?.toString() ?? "");
                        setError("");
                      }}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                <div className="trade-filter-sheet__price">
                  <label>
                    Từ (VNĐ)
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={min}
                      placeholder="Không giới hạn"
                      onChange={(event) => {
                        setMin(event.target.value);
                        setError("");
                      }}
                    />
                  </label>
                  <span>—</span>
                  <label>
                    Đến (VNĐ)
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={max}
                      placeholder="Không giới hạn"
                      onChange={(event) => {
                        setMax(event.target.value);
                        setError("");
                      }}
                    />
                  </label>
                </div>
              </fieldset>
            )}
            <label className="trade-filter-sheet__featured">
              <span>
                <strong>Chỉ tin nổi bật</strong>
                <small>Ưu tiên những tin được giới thiệu</small>
              </span>
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) => setFeatured(event.target.checked)}
              />
              <span className="trade-filter-sheet__switch" aria-hidden="true" />
            </label>
            {nonProfit && (
              <p className="trade-filter-sheet__note">
                Các hoạt động cộng đồng là tin phi lợi nhuận, không áp dụng bộ
                lọc giá.
              </p>
            )}
            {error && (
              <p className="trade-filter-sheet__error" role="alert">
                {error}
              </p>
            )}
          </div>
          <footer>
            <button
              type="button"
              onClick={() => {
                setCategory(EMPTY_TRADE_FILTERS.category);
                setFeatured(false);
                setMin("");
                setMax("");
                setError("");
              }}
            >
              Đặt lại
            </button>
            <button type="submit">Áp dụng bộ lọc</button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
