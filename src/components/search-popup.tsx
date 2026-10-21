import { useMemo, useRef, useState } from "react";
import { Icon, useNavigate } from "zmp-ui";
import { useSearch } from "@/hooks/use-search";
import { useDialog } from "@/hooks/use-dialog";
import { getSearchResultPath } from "@/lib/search-routes";
import SearchResultGroup from "@/components/search/search-result-group";
import type { SearchResult } from "@/types/search";
import "@/css/components/search-popup.css";

const SUGGESTIONS = ["Hồ Dầu Tiếng", "Chùa", "Lễ hội", "Mãng cầu", "Tour"];

export default function SearchPopup({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return open ? <SearchContent onClose={onClose} /> : null;
}

function SearchContent({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const search = useSearch(query, true);
  useDialog(panel, onClose);
  const groups = useMemo(() => {
    const result = new Map<string, SearchResult[]>();
    search.items.forEach((item) =>
      result.set(item.resourceLabel, [
        ...(result.get(item.resourceLabel) ?? []),
        item,
      ]),
    );
    return [...result.entries()];
  }, [search.items]);
  const keyword = query.trim();

  return (
    <div className="search-popup">
      <div className="search-popup__backdrop" onClick={onClose} />
      <div
        ref={panel}
        className="search-popup__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm LocalGo"
        tabIndex={-1}
      >
        <div className="search-popup__bar">
          <div className="search-popup__input">
            <Icon icon="zi-search" />
            <input
              ref={inputRef}
              type="search"
              aria-label="Từ khóa tìm kiếm"
              placeholder="Tìm địa điểm, đặc sản, tin tức..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                className="search-popup__clear"
                type="button"
                aria-label="Xóa từ khóa"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                <Icon icon="zi-close-circle-solid" />
              </button>
            )}
          </div>
          <button
            className="search-popup__cancel"
            type="button"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
        <div className="search-popup__body" aria-busy={search.loading}>
          {!keyword && (
            <div className="search-popup__suggest">
              <h2>Khám phá LocalGo</h2>
              <p>Tìm địa điểm, món ngon và những trải nghiệm quanh bạn.</p>
              <p>Từ khóa gợi ý</p>
              <div className="search-popup__chips">
                {SUGGESTIONS.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => setQuery(word)}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}
          {keyword.length === 1 && (
            <p className="search-popup__empty">
              Nhập ít nhất 2 ký tự để tìm kiếm.
            </p>
          )}
          {search.meta && (
            <p className="search-popup__count" role="status">
              {search.meta.total} kết quả cho “{keyword}”
            </p>
          )}
          {search.error && (
            <div className="search-popup__state" role="alert">
              <p>{search.error}</p>
              <button
                type="button"
                onClick={search.items.length ? search.loadMore : search.retry}
              >
                Thử lại
              </button>
            </div>
          )}
          {!search.loading &&
            !search.error &&
            keyword.length >= 2 &&
            search.meta?.total === 0 && (
              <div className="search-popup__state">
                <Icon icon="zi-search" />
                <strong>Chưa tìm thấy kết quả</strong>
                <p>Thử từ khóa khác hoặc tên địa điểm bạn muốn khám phá.</p>
              </div>
            )}
          {groups.map(([label, items]) => (
            <SearchResultGroup
              key={label}
              label={label}
              items={items}
              onSelect={(item) => {
                onClose();
                navigate(getSearchResultPath(item));
              }}
            />
          ))}
          {search.loading && (
            <p className="search-popup__empty" role="status">
              Đang tìm kiếm...
            </p>
          )}
          {search.meta && search.meta.page < search.meta.totalPages && (
            <button
              className="search-popup__more"
              type="button"
              disabled={search.loading}
              onClick={search.loadMore}
            >
              {search.loading ? "Đang tải..." : "Xem thêm kết quả"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
