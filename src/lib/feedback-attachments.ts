export const MAX_FEEDBACK_ATTACHMENTS = 10;
export const MAX_FEEDBACK_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_FEEDBACK_VIDEO_SIZE = 50 * 1024 * 1024;

export type FeedbackAttachmentKind = "image" | "video";

type AttachmentCandidate = Pick<File, "name" | "size" | "type">;

const SUPPORTED_TYPES: Record<
  string,
  { kind: FeedbackAttachmentKind; mimeType: string }
> = {
  jpg: { kind: "image", mimeType: "image/jpeg" },
  jpeg: { kind: "image", mimeType: "image/jpeg" },
  png: { kind: "image", mimeType: "image/png" },
  webp: { kind: "image", mimeType: "image/webp" },
  mp4: { kind: "video", mimeType: "video/mp4" },
  mov: { kind: "video", mimeType: "video/quicktime" },
  webm: { kind: "video", mimeType: "video/webm" },
};

export function validateFeedbackAttachment(
  file: AttachmentCandidate
): { ok: true; kind: FeedbackAttachmentKind } | { ok: false; error: string } {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const supported = SUPPORTED_TYPES[extension];
  if (
    !supported ||
    (file.type &&
      file.type !== "application/octet-stream" &&
      file.type.toLowerCase() !== supported.mimeType)
  ) {
    return { ok: false, error: `${file.name}: chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc video MP4, MOV, WebM.` };
  }

  const maxSize =
    supported.kind === "image"
      ? MAX_FEEDBACK_IMAGE_SIZE
      : MAX_FEEDBACK_VIDEO_SIZE;
  if (file.size > maxSize) {
    return {
      ok: false,
      error: `${file.name} vượt quá ${supported.kind === "image" ? "5MB" : "50MB"}.`,
    };
  }

  return { ok: true, kind: supported.kind };
}

export function selectFeedbackAttachments<T extends AttachmentCandidate>(
  files: readonly T[],
  existingCount: number
): {
  accepted: Array<{ file: T; kind: FeedbackAttachmentKind }>;
  errors: string[];
} {
  const accepted: Array<{ file: T; kind: FeedbackAttachmentKind }> = [];
  const errors: string[] = [];
  let overLimit = false;

  for (const file of files) {
    const validation = validateFeedbackAttachment(file);
    if (!validation.ok) {
      errors.push(validation.error);
    } else if (existingCount + accepted.length >= MAX_FEEDBACK_ATTACHMENTS) {
      overLimit = true;
    } else {
      accepted.push({ file, kind: validation.kind });
    }
  }

  if (overLimit) errors.unshift("Chỉ được đính kèm tối đa 10 ảnh/video");
  return { accepted, errors };
}
