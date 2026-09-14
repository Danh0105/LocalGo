import PreviewableImage from "@/components/previewable-image";
import { UploadedFeedbackAttachment } from "@/services/feedback";

interface FeedbackTicketAttachmentsProps {
  attachments?: UploadedFeedbackAttachment[];
}

function FeedbackTicketAttachments({ attachments }: FeedbackTicketAttachmentsProps) {
  if (!attachments?.length) return null;

  const imageUrls = attachments
    .filter((attachment) => attachment.mimeType.startsWith("image/"))
    .map((attachment) => attachment.url);

  return (
    <div className="feedback-ticket-attachments">
      <span className="feedback-ticket-attachments__label">
        Ảnh/video đính kèm ({attachments.length})
      </span>
      <div className="feedback-ticket-attachments__grid">
        {attachments.map((attachment, index) =>
          attachment.mimeType.startsWith("image/") ? (
            <PreviewableImage
              key={attachment.id}
              className="feedback-ticket-attachments__media"
              src={attachment.thumbnailUrl || attachment.url}
              previewImages={imageUrls}
              previewIndex={imageUrls.indexOf(attachment.url)}
              previewTitle="Ảnh đính kèm phản hồi"
              alt={`Ảnh đính kèm ${index + 1}`}
            />
          ) : (
            <video
              key={attachment.id}
              className="feedback-ticket-attachments__media"
              src={attachment.url}
              controls
              playsInline
              preload="none"
              aria-label={`Video đính kèm ${index + 1}`}
            />
          )
        )}
      </div>
    </div>
  );
}

export default FeedbackTicketAttachments;
