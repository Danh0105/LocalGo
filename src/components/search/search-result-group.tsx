import { Icon } from "zmp-ui";
import type { SearchResult } from "@/types/search";
import temple from "@/static/temple.png";
import agriculture from "@/static/tractor.png";
import cuisine from "@/static/restaurant.png";
import tour from "@/static/world-tour.png";
import craft from "@/static/pottery.png";
import map from "@/static/map.png";
import contact from "@/static/phone.png";
import fallback from "@/static/image-placeholder.svg";

const placeholders: Partial<Record<SearchResult["resourceType"], string>> = {
  TEMPLE: temple,
  AGRICULTURE: agriculture,
  CUISINE: cuisine,
  SPECIALTY: cuisine,
  EXPERIENCE_TOUR: tour,
  CRAFT_VILLAGE: craft,
  MAP_PLACE: map,
  CONTACT: contact,
};

export default function SearchResultGroup({
  label,
  items,
  onSelect,
}: {
  label: string;
  items: SearchResult[];
  onSelect: (item: SearchResult) => void;
}) {
  return (
    <section className="search-popup__group">
      <h3>
        <span />
        {label}
        <small>{items.length}</small>
      </h3>
      {items.map((item) => (
        <button
          className="search-result"
          key={`${item.resourceType}:${item.id}`}
          type="button"
          onClick={() => onSelect(item)}
        >
          <div
            className={`search-result__image${item.imageUrl ? " search-result__image--photo" : ""}`}
          >
            <img
              src={item.imageUrl || placeholders[item.resourceType] || fallback}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src =
                  placeholders[item.resourceType] || fallback;
              }}
            />
          </div>
          <div className="search-result__body">
            <h4>{item.title}</h4>
            <p>{item.summary || item.category || item.resourceLabel}</p>
          </div>
          <Icon icon="zi-chevron-right" />
        </button>
      ))}
    </section>
  );
}
