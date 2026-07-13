import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, useNavigate } from "zmp-ui";

import { agricultureItems } from "@/data/agriculture";
import { attractions } from "@/data/attractions";
import { contactItems } from "@/data/contacts";
import { craftVillages } from "@/data/craft-villages";
import { cuisineItems } from "@/data/cuisine";
import { experienceTours } from "@/data/experience-tours";
import { feedbackChannels } from "@/data/feedback";
import { festivals } from "@/data/festivals";
import { historicalSites } from "@/data/historical-sites";
import { mapPlaces } from "@/data/map-places";
import { newsArticles } from "@/data/news";
import { ocopProducts } from "@/data/ocop";
import { specialties } from "@/data/specialties";
import { temples } from "@/data/temples";
import "../css/components/search-popup.css";

interface SearchEntry {
  key: string;
  title: string;
  summary: string;
  group: string;
  path: string;
  image: string;
  haystack: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

function buildEntries(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  const add = (
    group: string,
    basePath: string,
    items: {
      id: string;
      title: string;
      summary: string;
      image: string;
      extra?: string;
    }[],
  ) => {
    for (const item of items) {
      entries.push({
        key: `${basePath}/${item.id}`,
        title: item.title,
        summary: item.summary,
        group,
        path: `${basePath}/${item.id}`,
        image: item.image,
        haystack: normalize(
          `${item.title} ${item.summary} ${item.extra ?? ""} ${group}`,
        ),
      });
    }
  };

  add(
    "Điểm du lịch",
    "/attractions",
    attractions.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: `${i.category} ${i.address}`,
    })),
  );
  add(
    "Đền, Chùa - Miếu",
    "/temples",
    temples.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: `${i.type} ${i.address}`,
    })),
  );
  add(
    "Đặc sản",
    "/specialties",
    specialties.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: i.category,
    })),
  );
  add(
    "Di tích lịch sử",
    "/historical-sites",
    historicalSites.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: i.address,
    })),
  );
  add(
    "Nông nghiệp",
    "/agriculture",
    agricultureItems.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: i.category,
    })),
  );
  add(
    "OCOP",
    "/ocop",
    ocopProducts.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: `${i.category} ${i.address}`,
    })),
  );
  add(
    "Làng nghề",
    "/craft-villages",
    craftVillages.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: `${i.category} ${i.address}`,
    })),
  );
  add(
    "Ẩm thực",
    "/cuisine",
    cuisineItems.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: i.category,
    })),
  );
  add(
    "Lễ hội",
    "/festivals",
    festivals.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: i.category,
    })),
  );
  add(
    "Tour trải nghiệm",
    "/experience-tours",
    experienceTours.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: i.category,
    })),
  );
  add(
    "Bản đồ",
    "/map",
    mapPlaces.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: `${i.category} ${i.address}`,
    })),
  );
  add(
    "Tin tức",
    "/news",
    newsArticles.map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.summary,
      image: i.image,
      extra: i.category,
    })),
  );
  add(
    "Liên hệ",
    "/contacts",
    contactItems.map((i) => ({
      id: i.id,
      title: i.name,
      summary: i.summary,
      image: i.image,
      extra: `${i.category} ${i.role} ${i.address}`,
    })),
  );
  add(
    "Phản hồi",
    "/feedback",
    feedbackChannels.map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.summary,
      image: i.image,
      extra: i.category,
    })),
  );

  return entries;
}

const allEntries = buildEntries();

const SUGGESTIONS = [
  "Hồ Dầu Tiếng",
  "Chùa",
  "OCOP",
  "Lễ hội",
  "Mãng cầu",
  "Tour",
];

const MAX_RESULTS = 30;

interface SearchPopupProps {
  open: boolean;
  onClose: () => void;
}

function SearchPopup({ open, onClose }: SearchPopupProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [open]);

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    const matched = allEntries
      .filter((entry) => entry.haystack.includes(q))
      .slice(0, MAX_RESULTS);

    const byGroup = new Map<string, SearchEntry[]>();
    for (const entry of matched) {
      const list = byGroup.get(entry.group) ?? [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }
    return [...byGroup.entries()];
  }, [query]);

  if (!open) return null;

  const trimmed = query.trim();

  return (
    <div className="search-popup" role="dialog" aria-modal="true">
      <div className="search-popup__backdrop" onClick={onClose} />

      <div className="search-popup__panel">
        <div className="search-popup__bar">
          <div className="search-popup__input">
            <Icon icon="zi-search" />
            <input
              ref={inputRef}
              type="search"
              placeholder="Tìm địa điểm, đặc sản, tin tức..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                className="search-popup__clear"
                type="button"
                aria-label="Xóa"
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

        <div className="search-popup__body">
          {!trimmed && (
            <div className="search-popup__suggest">
              <p>Từ khóa gợi ý</p>
              <div className="search-popup__chips">
                {SUGGESTIONS.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => setQuery(keyword)}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}

          {trimmed && groups.length === 0 && (
            <p className="search-popup__empty">
              Không tìm thấy kết quả cho “{trimmed}”
            </p>
          )}

          {groups.map(([group, entries]) => (
            <section className="search-popup__group" key={group}>
              <h3>
                <span />
                {group}
              </h3>

              {entries.map((entry) => (
                <button
                  className="search-result"
                  key={entry.key}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(entry.path);
                  }}
                >
                  <div className="search-result__image">
                    <img src={entry.image} alt="" />
                  </div>

                  <div className="search-result__body">
                    <h4>{entry.title}</h4>
                    <p>{entry.summary}</p>
                  </div>

                  <Icon icon="zi-chevron-right" />
                </button>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SearchPopup;
