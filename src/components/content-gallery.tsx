import { useMemo, useState } from "react";
import PreviewableImage from "@/components/previewable-image";
import { GalleryImage, normalizeGalleryImages } from "@/data/content-images";
import imagePlaceholder from "@/static/image-placeholder.svg";
import "@/css/components/content-gallery.css";

interface Props {
  imageUrl?: string | null;
  imageAlt?: string;
  galleryImages?: GalleryImage[];
  fallbackSrc: string;
  title: string;
}

export default function ContentGallery(props: Props) {
  // A different record/gallery resets selection and loading even if the route reuses this component.
  const identity = `${props.imageUrl ?? ""}:${JSON.stringify(props.galleryImages ?? [])}`;
  return <Gallery key={identity} {...props} />;
}

function Gallery({ imageUrl, imageAlt, galleryImages, fallbackSrc, title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const alt = imageAlt?.trim() || title;
  const errorFallback = imageUrl?.trim() === fallbackSrc || /^https?:/i.test(fallbackSrc) ? imagePlaceholder : fallbackSrc;
  const images = useMemo(() => [
    { src: imageUrl?.trim() || fallbackSrc, thumbnail: imageUrl?.trim() || fallbackSrc, alt },
    ...normalizeGalleryImages(galleryImages).filter(image => image.imageUrl !== imageUrl).map((image, index) => ({
      src: image.imageUrl, thumbnail: image.thumbnailUrl ?? image.imageUrl, alt: `${alt} - ảnh ${index + 2}`,
    })),
  ], [imageUrl, fallbackSrc, alt, galleryImages]);
  const index = Math.min(activeIndex, images.length - 1);
  const active = images[index];
  const displaySrc = failed.has(active.src) ? errorFallback : active.src;
  const previewImages = images.map(image => ({ src: failed.has(image.src) ? errorFallback : image.src, thumbnailSrc: image.thumbnail, alt: image.alt }));
  const markFailed = (src: string) => {
    setFailed(current => new Set(current).add(src));
    setLoading(false);
  };

  const mainImage = <PreviewableImage
    key={active.src}
    src={displaySrc}
    alt={active.alt}
    previewImages={previewImages}
    previewIndex={index}
    previewTitle={title}
    previewFallbackSrc={errorFallback}
    onLoad={() => setLoading(false)}
    onError={() => markFailed(active.src)}
  />;
  if (images.length === 1) return mainImage;

  return <div className="content-gallery" aria-label={`Hình ảnh ${title}`}>
    <div className={`content-gallery-main${loading ? " is-loading" : ""}`}>
      {mainImage}
      <span className="content-gallery-count" aria-live="polite">{index + 1} / {images.length}</span>
      {failed.has(active.src) && <span className="content-gallery-error">Ảnh chưa tải được</span>}
    </div>
    <nav className="content-gallery-thumbnails" aria-label="Chọn ảnh địa điểm">
      {images.map((image, imageIndex) => <button type="button" key={`${image.src}-${imageIndex}`}
        aria-label={`Xem ảnh ${imageIndex + 1}`} aria-pressed={index === imageIndex}
        className={index === imageIndex ? "is-active" : ""}
        onClick={() => { if (index !== imageIndex) { setLoading(true); setActiveIndex(imageIndex); } }}>
        <img src={image.thumbnail} alt="" loading="lazy" onError={event => {
          const element = event.currentTarget;
          if (element.dataset.fallback === "placeholder") return;
          if (element.dataset.fallback === "original" || image.thumbnail === image.src) {
            element.dataset.fallback = "placeholder"; element.src = errorFallback;
          } else { element.dataset.fallback = "original"; element.src = image.src; }
        }} />
      </button>)}
    </nav>
  </div>;
}
