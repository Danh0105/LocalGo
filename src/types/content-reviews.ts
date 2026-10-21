export const CONTENT_REVIEW_TYPES = [
  "temples",
  "specialties",
  "historical-sites",
  "agriculture",
  "craft-villages",
  "cuisine",
  "festivals",
  "experience-tours",
] as const;
export type ContentReviewType = (typeof CONTENT_REVIEW_TYPES)[number];
export type ReviewStar = "1" | "2" | "3" | "4" | "5";

export interface ContentReview {
  id: string;
  targetType: ContentReviewType;
  targetId: string;
  userId: string;
  rating: number;
  content: string;
  status: "PUBLISHED" | "HIDDEN";
  replyContent: string | null;
  repliedAt: string | null;
  images: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    sortOrder: number;
  }[];
  reviewer: { id: string; displayName: string; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
  target?: {
    targetType: ContentReviewType;
    id: string;
    name: string | null;
    imageUrl: string | null;
    isActive: boolean;
    deleted: boolean;
  };
}

export interface ContentReviewSummary {
  average: number;
  total: number;
  counts: Record<ReviewStar, number>;
  distribution: Record<ReviewStar, number>;
}

export interface ContentReviewInput {
  rating: number;
  content: string;
  imageIds?: string[];
}
