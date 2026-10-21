import { Compass, LayoutGrid, Store } from "lucide-react";
export type ContentSource = "all" | "editorial" | "trade";

export default function ContentSourceTabs({
  value,
  onChange,
}: {
  value: ContentSource;
  onChange: (value: ContentSource) => void;
}) {
  return (
    <div
      className="directory-source-tabs"
      role="group"
      aria-label="Nguồn nội dung"
    >
      {(
        [
          { value: "all", label: "Tất cả", icon: LayoutGrid },
          { value: "editorial", label: "Khám phá", icon: Compass },
          { value: "trade", label: "Giao thương", icon: Store },
        ] as const
      ).map((item) => (
        <button
          type="button"
          key={item.value}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          <item.icon size={15} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
