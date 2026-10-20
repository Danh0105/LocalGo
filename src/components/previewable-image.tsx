import {
  ImgHTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import "@/css/components/image-viewer.css";

export interface PreviewImageItem {
  src: string;
  alt?: string;
  thumbnailSrc?: string;
}

interface PreviewableImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  previewImages?: readonly (string | PreviewImageItem)[];
  previewIndex?: number;
  previewTitle?: string;
  previewFallbackSrc?: string;
}

function PreviewableImage({
  src,
  alt = "",
  className,
  previewImages,
  previewIndex = 0,
  previewTitle = "Xem hình ảnh",
  previewFallbackSrc,
  onClick,
  onKeyDown,
  tabIndex,
  ...imageProps
}: PreviewableImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(previewIndex);
  const swipeStartX = useRef<number | null>(null);
  const images = useMemo<PreviewImageItem[]>(() => {
    const normalizedImages = (previewImages?.length ? previewImages : [src])
      .map((image) =>
        typeof image === "string" ? { src: image, alt } : image
      )
      .filter((image) => Boolean(image.src));
    return normalizedImages.length > 0 ? normalizedImages : [{ src, alt }];
  }, [alt, previewImages, src]);
  const currentIndex = Math.min(activeIndex, images.length - 1);

  const showImage = (index: number) => {
    setActiveIndex((index + images.length) % images.length);
  };

  const openViewer = () => {
    setActiveIndex(Math.min(previewIndex, images.length - 1));
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) =>
          (current - 1 + images.length) % images.length
        );
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % images.length);
      }
    };
    document.addEventListener("keydown", handleKeyboard);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, [images.length, isOpen]);

  const handleImageKeyDown = (
    event: ReactKeyboardEvent<HTMLImageElement>
  ) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openViewer();
    }
  };

  return (
    <>
      <img
        {...imageProps}
        className={["app-previewable-image", className].filter(Boolean).join(" ")}
        src={src}
        alt={alt}
        role="button"
        tabIndex={tabIndex ?? 0}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) openViewer();
        }}
        onKeyDown={handleImageKeyDown}
      />

      {isOpen &&
        createPortal(
          <section
            className="app-image-viewer"
            role="dialog"
            aria-modal="true"
            aria-label={previewTitle}
          >
            <header className="app-image-viewer__header">
              <button
                type="button"
                autoFocus
                aria-label="Đóng trình xem ảnh"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
              <strong>{previewTitle}</strong>
              <span aria-live="polite">
                {currentIndex + 1}/{images.length}
              </span>
            </header>

            <div
              className="app-image-viewer__stage"
              onTouchStart={(event) => {
                swipeStartX.current = event.changedTouches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const startX = swipeStartX.current;
                swipeStartX.current = null;
                if (startX === null) return;
                const endX = event.changedTouches[0]?.clientX ?? startX;
                const distance = endX - startX;
                if (Math.abs(distance) < 45) return;
                showImage(currentIndex + (distance > 0 ? -1 : 1));
              }}
            >
              <div
                className="app-image-viewer__track"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {images.map((image, index) => (
                  <div
                    className="app-image-viewer__slide"
                    aria-hidden={index !== currentIndex}
                    key={`${image.src}-${index}`}
                  >
                    <img
                      src={index === currentIndex ? image.src : undefined}
                      alt={image.alt ?? alt}
                      draggable={false}
                      onError={(event) => {
                        if (!previewFallbackSrc || event.currentTarget.dataset.failed) return;
                        event.currentTarget.dataset.failed = "true";
                        event.currentTarget.src = previewFallbackSrc;
                      }}
                    />
                  </div>
                ))}
              </div>

              {images.length > 1 && (
                <>
                  <button
                    className="app-image-viewer__arrow app-image-viewer__arrow--previous"
                    type="button"
                    aria-label="Xem ảnh trước"
                    onClick={() => showImage(currentIndex - 1)}
                  />
                  <button
                    className="app-image-viewer__arrow app-image-viewer__arrow--next"
                    type="button"
                    aria-label="Xem ảnh tiếp theo"
                    onClick={() => showImage(currentIndex + 1)}
                  />
                </>
              )}
            </div>

            {images.length > 1 && (
              <nav
                className="app-image-viewer__thumbnails"
                aria-label="Chọn ảnh cần xem"
              >
                {images.map((image, index) => (
                  <button
                    className={index === currentIndex ? "is-active" : ""}
                    type="button"
                    key={`${image.src}-${index}`}
                    aria-label={`Xem ảnh ${index + 1}`}
                    aria-current={index === currentIndex ? "true" : undefined}
                    onClick={() => showImage(index)}
                  >
                    <img src={image.thumbnailSrc ?? image.src} alt="" loading="lazy" onError={(event) => {
                      if (!previewFallbackSrc || event.currentTarget.dataset.failed) return;
                      event.currentTarget.dataset.failed = "true";
                      event.currentTarget.src = previewFallbackSrc;
                    }} />
                  </button>
                ))}
              </nav>
            )}
          </section>,
          document.body
        )}
    </>
  );
}

export default PreviewableImage;
