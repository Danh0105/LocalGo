import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, useNavigate } from "zmp-ui";

import { attractions } from "@/data/attractions";
import { getAgricultureItems } from "@/services/agriculture";
import { getContacts } from "@/services/contacts";
import { getCraftVillages } from "@/services/craft-villages";
import { getCuisineItems } from "@/services/cuisine";
import { getExperienceTours } from "@/services/experience-tours";
import { getFeedbackChannels } from "@/services/feedback";
import { getFestivals } from "@/services/festivals";
import { getHistoricalSites } from "@/services/historical-sites";
import { getMapPlaces } from "@/services/map-places";
import { getNewsArticles } from "@/services/news";
import { getSpecialties } from "@/services/specialties";
import { getTemples } from "@/services/temples";
import templePlaceholder from "@/static/temple.png";
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

function toEntries(
  group: string,
  basePath: string,
  items: {
    id: string;
    title: string;
    summary: string;
    image: string;
    extra?: string;
  }[],
): SearchEntry[] {
  return items.map((item) => ({
    key: `${basePath}/${item.id}`,
    title: item.title,
    summary: item.summary,
    group,
    path: `${basePath}/${item.id}`,
    image: item.image,
    haystack: normalize(
      `${item.title} ${item.summary} ${item.extra ?? ""} ${group}`,
    ),
  }));
}

// No backend module exists for "Điểm du lịch" yet, so this group still
// reads from the local mock data.
function buildStaticEntries(): SearchEntry[] {
  return toEntries(
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
}

const staticEntries = buildStaticEntries();

const SUGGESTIONS = [
  "Hồ Dầu Tiếng",
  "Chùa",
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
  const [apiEntries, setApiEntries] = useState<SearchEntry[]>([]);
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

  useEffect(() => {
    if (!open) return undefined;
    let isActive = true;

    Promise.allSettled([
      getSpecialties().then((items) =>
        toEntries(
          "Đặc sản",
          "/specialties",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.image,
            extra: i.category,
          })),
        ),
      ),
      getHistoricalSites().then((items) =>
        toEntries(
          "Di tích lịch sử",
          "/historical-sites",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.image,
            extra: i.address,
          })),
        ),
      ),
      getAgricultureItems().then((items) =>
        toEntries(
          "Nông nghiệp",
          "/agriculture",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.image,
            extra: i.category,
          })),
        ),
      ),
      getCraftVillages().then((items) =>
        toEntries(
          "Làng nghề",
          "/craft-villages",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.image,
            extra: `${i.category} ${i.address}`,
          })),
        ),
      ),
      getCuisineItems().then((items) =>
        toEntries(
          "Ẩm thực",
          "/cuisine",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.image,
            extra: i.category,
          })),
        ),
      ),
      getFestivals().then((items) =>
        toEntries(
          "Lễ hội",
          "/festivals",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.image,
            extra: i.category,
          })),
        ),
      ),
      getExperienceTours().then((items) =>
        toEntries(
          "Tour trải nghiệm",
          "/experience-tours",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.image,
            extra: i.category,
          })),
        ),
      ),
      getMapPlaces().then((items) =>
        toEntries(
          "Bản đồ",
          "/map",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.image,
            extra: `${i.category} ${i.address}`,
          })),
        ),
      ),
      getNewsArticles().then((items) =>
        toEntries(
          "Tin tức",
          "/news",
          items.map((i) => ({
            id: i.id,
            title: i.title,
            summary: i.summary,
            image: i.image,
            extra: i.category,
          })),
        ),
      ),
      getContacts().then((items) =>
        toEntries(
          "Liên hệ",
          "/contacts",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.image,
            extra: `${i.category} ${i.role} ${i.address}`,
          })),
        ),
      ),
      getFeedbackChannels().then((items) =>
        toEntries(
          "Phản hồi",
          "/feedback",
          items.map((i) => ({
            id: i.id,
            title: i.title,
            summary: i.summary,
            image: i.image,
            extra: i.category,
          })),
        ),
      ),
      getTemples().then((items) =>
        toEntries(
          "Đền, Chùa - Miếu",
          "/temples",
          items.map((i) => ({
            id: i.id,
            title: i.name,
            summary: i.summary,
            image: i.imageUrl || templePlaceholder,
            extra: `${i.type} ${i.address} Đền Chùa Miếu`,
          })),
        ),
      ),
    ]).then((results) => {
      if (!isActive) return;
      const entries = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );
      setApiEntries(entries);
    });

    return () => {
      isActive = false;
    };
  }, [open]);

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    const matched = [...staticEntries, ...apiEntries]
      .filter((entry) => entry.haystack.includes(q))
      .slice(0, MAX_RESULTS);

    const byGroup = new Map<string, SearchEntry[]>();
    for (const entry of matched) {
      const list = byGroup.get(entry.group) ?? [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }
    return [...byGroup.entries()];
  }, [query, apiEntries]);

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
