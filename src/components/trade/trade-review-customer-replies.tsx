import { FormEvent, useRef, useState } from "react";
import { useCurrentUser } from "@/contexts/auth-context";
import {
  replyToTradeReviewOwner,
  TradeReviewCustomerReply,
  TradeReviewResponse,
} from "@/services/trade-posts";
import "@/css/components/trade-review-customer-replies.css";

interface Props {
  review: TradeReviewResponse;
  ownerId?: string;
  readOnly?: boolean;
  onReply?: (reply: TradeReviewCustomerReply) => void;
}

export default function TradeReviewCustomerReplies({
  review, ownerId, readOnly = false, onReply,
}: Props) {
  const { user, accessToken, authenticate } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const sending = useRef(false);
  const canReply = !readOnly && Boolean(review.replyContent) &&
    review.status === "PUBLISHED" && (!user || user.id !== ownerId);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canReply || sending.current) return;
    const text = content.trim();
    if (!text || text.length > 500) {
      setError("Vui lòng nhập câu trả lời từ 1 đến 500 ký tự.");
      return;
    }
    sending.current = true;
    setIsSending(true);
    setError("");
    try {
      const session = accessToken
        ? { accessToken, user }
        : await authenticate();
      if (session.user?.id === ownerId) {
        setError("Chủ tin có thể phản hồi đánh giá trong phần quản lý tin.");
        return;
      }
      const reply = await replyToTradeReviewOwner(
        session.accessToken, review.tradePostId, review.id, text,
      );
      onReply?.(reply);
      setContent("");
      setIsOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : "Không thể gửi câu trả lời. Vui lòng thử lại.");
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  };

  return (
    <div className="trade-customer-replies">
      {review.customerReplies?.map((reply) => (
        <article className="trade-customer-replies__item" key={reply.id}>
          <strong>{reply.author?.displayName || "Khách hàng LocalGo"}</strong>
          <p>{reply.content}</p>
          <time dateTime={reply.createdAt}>
            {new Date(reply.createdAt).toLocaleString("vi-VN")}
          </time>
        </article>
      ))}
      {canReply && !isOpen && (
        <button type="button" onClick={() => setIsOpen(true)}>
          Trả lời chủ tin
        </button>
      )}
      {canReply && isOpen && (
        <form onSubmit={submit}>
          <label htmlFor={`trade-customer-reply-${review.id}`}>
            Trả lời công khai cho chủ tin
          </label>
          <textarea
            id={`trade-customer-reply-${review.id}`}
            autoFocus
            rows={3}
            maxLength={500}
            value={content}
            disabled={isSending}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Nhập câu trả lời của bạn..."
          />
          <small>{content.length}/500 ký tự · Câu trả lời sẽ hiển thị công khai.</small>
          {error && <p className="trade-customer-replies__error" role="alert">{error}</p>}
          <div className="trade-customer-replies__actions">
            <button type="button" disabled={isSending} onClick={() => {
              setIsOpen(false);
              setError("");
            }}>Hủy</button>
            <button type="submit" disabled={isSending || !content.trim()}>
              {isSending ? "Đang gửi..." : "Gửi trả lời"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
