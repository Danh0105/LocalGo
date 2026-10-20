export interface GalleryImage {
  mediaId: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  sortOrder: number;
}

export interface UploadedMedia {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
}

export interface ContentImageFields {
  imageUrl?: string | null;
  imageAlt?: string;
  galleryImages?: GalleryImage[];
}

export function normalizeGalleryImages(images: GalleryImage[] | null | undefined): GalleryImage[] {
  const seen = new Set<string>();
  return (Array.isArray(images) ? images : [])
    .filter(image => image && typeof image.imageUrl === "string" && image.imageUrl.trim())
    .slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .filter(image => {
      const key = image.mediaId || image.imageUrl;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function mapContentImages(item: ContentImageFields): Required<ContentImageFields> {
  return {
    imageUrl: item.imageUrl?.trim() || null,
    imageAlt: item.imageAlt ?? "",
    galleryImages: normalizeGalleryImages(item.galleryImages),
  };
}
