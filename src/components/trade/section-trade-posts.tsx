import { useState } from "react";
import {
  Search,
  ArrowUpRight,
  FileSearch,
  SlidersHorizontal,
  X,
  Sparkles,
} from "lucide-react";
import { useSectionTradePosts } from "@/hooks/use-section-trade-posts";
import { useTradePostCategories } from "@/hooks/use-trade-post-categories";
import type { TradePostSection, TradePostSortBy } from "@/services/trade-posts";
import SectionTradeCard from "./section-trade-card";
import SectionTradeFilterSheet from "./section-trade-filter-sheet";
import "@/css/components/section-trade-posts.css";

const labels: Record<TradePostSection, { title: string; description: string }> =
  {
    cuisine: {
      title: "Tin từ nhà hàng",
      description: "Món ngon, dịch vụ và ưu đãi từ các nhà hàng địa phương.",
    },
    temples: {
      title: "Hoạt động cộng đồng",
      description: "Thông tin phi lợi nhuận từ ban quản lý đền, chùa, miếu.",
    },
    specialties: {
      title: "Đặc sản từ chủ vườn",
      description: "Khám phá sản vật và tin mới từ các nhà vườn địa phương.",
    },
    agriculture: {
      title: "Tin từ nhà vườn",
      description:
        "Sản phẩm và hoạt động giao thương của các chủ vườn địa phương.",
    },
  };

export default function SectionTradePosts({
  section,
}: {
  section: TradePostSection;
}) {
  return <SectionTradeContent key={section} section={section} />;
}

function SectionTradeContent({ section }: { section: TradePostSection }) {
  const feed = useSectionTradePosts(section);
  const categoryOptions = useTradePostCategories();
  const [filterOpen, setFilterOpen] = useState(false);
  const label = labels[section];
  return (
    <section className="section-trade" aria-label={label.title}>
      <header className="section-trade__heading">
        <div>
          <span className="section-trade__eyebrow">
            <span />
            LOCALGO MARKET
          </span>
          <h2>{label.title}</h2>
        </div>
        <span className="section-trade__heading-icon" aria-hidden="true">
          <ArrowUpRight size={23} />
        </span>
      </header>
      <p className="section-trade__description">{label.description}</p>
      <div className="section-trade__search-row">
        <div className="section-trade__search">
          <Search size={18} />
          <input
            type="search"
            aria-label={`Tìm kiếm ${label.title.toLowerCase()}`}
            placeholder="Tìm tin theo từ khóa..."
            value={feed.keyword}
            onChange={(event) => feed.setKeyword(event.target.value)}
          />
          {feed.keyword && (
            <button
              type="button"
              aria-label="Xóa từ khóa giao thương"
              onClick={() => feed.setKeyword("")}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button
          className={`section-trade__filter-button${feed.activeFilterCount ? " is-active" : ""}`}
          type="button"
          aria-label={`Bộ lọc giao thương${feed.activeFilterCount ? `, ${feed.activeFilterCount} đang áp dụng` : ""}`}
          aria-haspopup="dialog"
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal size={19} />
          {feed.activeFilterCount > 0 && <span>{feed.activeFilterCount}</span>}
        </button>
      </div>
      <div
        className="section-trade__categories"
        role="group"
        aria-label="Danh mục tin giao thương"
      >
        <button
          type="button"
          aria-pressed={!feed.filters.category}
          onClick={() => feed.setCategory("")}
        >
          Tất cả danh mục
        </button>
        {categoryOptions.categories.map((category) => (
          <button
            type="button"
            key={category.code}
            aria-pressed={feed.filters.category === category.code}
            onClick={() => feed.setCategory(category.code)}
          >
            {category.name}
          </button>
        ))}
      </div>
      {categoryOptions.error && !categoryOptions.isFallback && (
        <div className="section-trade__category-error">
          <span>{categoryOptions.error}</span>
          <button type="button" onClick={categoryOptions.reload}>
            Tải lại danh mục
          </button>
        </div>
      )}
      <div className="section-trade__filters">
        <label
          className={`section-trade__featured${feed.featured ? " is-active" : ""}`}
        >
          <input
            type="checkbox"
            checked={feed.featured}
            onChange={(event) => feed.setFeatured(event.target.checked)}
          />
          <Sparkles size={14} />
          Tin nổi bật
        </label>
        <label>
          <span className="section-trade__sr-only">
            Sắp xếp tin giao thương
          </span>
          <select
            value={feed.sortBy}
            onChange={(event) =>
              feed.setSortBy(event.target.value as TradePostSortBy)
            }
          >
            <option value="newest">Mới nhất</option>
            {section !== "temples" && (
              <>
                <option value="price_asc">Giá thấp đến cao</option>
                <option value="price_desc">Giá cao đến thấp</option>
              </>
            )}
            <option value="rating">Đánh giá cao</option>
            <option value="popular">Xem nhiều</option>
          </select>
        </label>
      </div>
      <div className="section-trade__result-heading">
        {feed.meta && (
          <p className="section-trade__count" role="status">
            {feed.meta.total} tin
            {feed.search ? ` cho “${feed.search}”` : " đang hiển thị"}
          </p>
        )}
        {feed.activeFilterCount > 0 && (
          <button
            type="button"
            className="section-trade__reset"
            onClick={feed.clearFilters}
          >
            Xóa bộ lọc
            <X size={12} />
          </button>
        )}
      </div>
      {(feed.filters.minPrice !== undefined ||
        feed.filters.maxPrice !== undefined) && (
        <button
          className="section-trade__price-tag"
          type="button"
          aria-label="Bỏ lọc khoảng giá"
          onClick={() =>
            feed.setFilters({
              ...feed.filters,
              minPrice: undefined,
              maxPrice: undefined,
            })
          }
        >
          {feed.filters.minPrice !== undefined
            ? new Intl.NumberFormat("vi-VN").format(feed.filters.minPrice)
            : "0"}
          đ –{" "}
          {feed.filters.maxPrice !== undefined
            ? `${new Intl.NumberFormat("vi-VN").format(feed.filters.maxPrice)}đ`
            : "Không giới hạn"}
          <X size={12} />
        </button>
      )}
      <div className="section-trade__list" aria-busy={feed.loading}>
        {feed.items.map((post) => (
          <SectionTradeCard key={post.id} post={post} />
        ))}
      </div>
      {feed.loading && (
        <p className="section-trade__status" role="status">
          Đang tải tin giao thương...
        </p>
      )}
      {feed.error && (
        <div className="section-trade__error" role="alert">
          <p>{feed.error}</p>
          <button
            type="button"
            onClick={feed.items.length ? feed.loadMore : feed.reload}
          >
            Thử lại
          </button>
        </div>
      )}
      {!feed.loading && !feed.error && feed.items.length === 0 && (
        <div className="section-trade__empty">
          <FileSearch size={30} />
          <strong>
            {feed.search || feed.activeFilterCount
              ? "Chưa tìm thấy tin phù hợp"
              : "Chưa có tin mới"}
          </strong>
          <p>
            {feed.search || feed.activeFilterCount
              ? "Thử từ khóa khác hoặc điều chỉnh bộ lọc của bạn."
              : "Các tin mới sẽ được cập nhật tại đây."}
          </p>
          {feed.activeFilterCount > 0 && (
            <button type="button" onClick={feed.clearFilters}>
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
      {filterOpen && (
        <SectionTradeFilterSheet
          filters={feed.filters}
          categories={categoryOptions.categories}
          nonProfit={section === "temples"}
          onApply={feed.setFilters}
          onClose={() => setFilterOpen(false)}
        />
      )}
      {feed.meta && feed.meta.page < feed.meta.totalPages && (
        <button
          className="section-trade__more"
          type="button"
          disabled={feed.loading}
          onClick={feed.loadMore}
        >
          {feed.loading ? "Đang tải..." : "Xem thêm tin"}
        </button>
      )}
    </section>
  );
}
