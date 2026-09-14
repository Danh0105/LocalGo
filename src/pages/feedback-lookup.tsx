import { FormEvent, useEffect, useState } from "react";
import { Icon, Page, Spinner, useNavigate } from "zmp-ui";

import PreviewableImage from "@/components/previewable-image";
import { useCurrentUser } from "@/contexts/auth-context";
import {
  FeedbackLookupError,
  FeedbackTicketLookup,
  FeedbackTicketStatus,
  getMyFeedbackTickets,
  lookupFeedbackTicket,
  UploadedFeedbackAttachment,
} from "@/services/feedback";
import "../css/pages/feedback.css";

const PHONE_PATTERN = /^\+?[0-9\s]+$/;

const RATE_LIMIT_MESSAGE =
  "Bạn tra cứu quá nhiều lần, vui lòng thử lại sau ít phút.";
const NOT_FOUND_MESSAGE =
  "Không tìm thấy phản hồi phù hợp. Vui lòng kiểm tra lại mã phản hồi và số điện thoại đã dùng khi gửi.";
const GENERIC_ERROR_MESSAGE =
  "Không thể tra cứu phản hồi, vui lòng thử lại sau.";

const STATUS_LABELS: Record<FeedbackTicketStatus, string> = {
  new: "Mới tiếp nhận",
  in_progress: "Đang xử lý",
  resolved: "Đã xử lý",
  closed: "Đã đóng",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function FeedbackTicketAttachments({
  attachments,
}: {
  attachments?: UploadedFeedbackAttachment[];
}) {
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

function FeedbackLookupPage() {
  const navigate = useNavigate();
  const {
    accessToken,
    status: authStatus,
    error: authError,
    authenticate,
  } = useCurrentUser();
  const [result, setResult] = useState<FeedbackTicketLookup>();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [myTickets, setMyTickets] = useState<FeedbackTicketLookup[]>([]);
  const [myTicketsError, setMyTicketsError] = useState<{
    message: string;
    retryable: boolean;
  } | null>(null);
  const [myTicketsUnauthorized, setMyTicketsUnauthorized] = useState(false);
  const [isMyTicketsLoading, setIsMyTicketsLoading] = useState(false);
  const [myTicketsReloadVersion, setMyTicketsReloadVersion] = useState(0);

  useEffect(() => {
    if (authStatus === "idle") {
      setIsMyTicketsLoading(false);
      setMyTickets([]);
      setMyTicketsError(null);
      setMyTicketsUnauthorized(false);
      return;
    }
    if (authStatus === "loading") {
      setIsMyTicketsLoading(true);
      setMyTicketsError(null);
      return;
    }
    if (!accessToken) {
      setIsMyTicketsLoading(false);
      setMyTickets([]);
      setMyTicketsError({
        message:
          authError || "Không thể xác thực tài khoản để tải phản hồi của bạn.",
        retryable: true,
      });
      setMyTicketsUnauthorized(true);
      return;
    }

    const controller = new AbortController();
    setIsMyTicketsLoading(true);
    setMyTicketsError(null);
    setMyTicketsUnauthorized(false);
    getMyFeedbackTickets(accessToken, controller.signal)
      .then((tickets) => {
        setMyTickets(tickets);
        setIsMyTicketsLoading(false);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        const isUnauthorized =
          requestError instanceof FeedbackLookupError &&
          requestError.status === 401;
        setMyTickets([]);
        setMyTicketsUnauthorized(isUnauthorized);
        setMyTicketsError({
          message: isUnauthorized
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem phản hồi của bạn."
            : requestError instanceof FeedbackLookupError
              ? requestError.message
              : "Không thể tải danh sách phản hồi của bạn.",
          retryable:
            !(requestError instanceof FeedbackLookupError) ||
            requestError.code !== "MY_FEEDBACK_UNAVAILABLE",
        });
        setIsMyTicketsLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, authError, authStatus, myTicketsReloadVersion]);

  const retryMyTickets = () => {
    if (!accessToken || myTicketsUnauthorized) {
      void authenticate().catch(() => undefined);
      return;
    }
    setMyTicketsReloadVersion((version) => version + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const ticketCode = String(formData.get("ticketCode") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    setError("");
    setResult(undefined);

    if (!ticketCode) {
      setError("Vui lòng nhập mã phản hồi.");
      return;
    }
    if (!phone || !PHONE_PATTERN.test(phone)) {
      setError("Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await lookupFeedbackTicket({ ticketCode, phone });
      setResult(data);
    } catch (requestError: unknown) {
      if (requestError instanceof FeedbackLookupError) {
        if (requestError.status === 429) {
          setError(RATE_LIMIT_MESSAGE);
        } else if (requestError.status === 404) {
          setError(NOT_FOUND_MESSAGE);
        } else {
          setError(requestError.message || GENERIC_ERROR_MESSAGE);
        }
      } else {
        setError(GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page className="feedback-page">
      <header className="feedback-header">
        <button
          className="feedback-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Lắng nghe người dân</span>
          <h1>Tra cứu phản hồi</h1>
        </div>
      </header>

      <main className="feedback-content">
        <form className="feedback-form" onSubmit={handleSubmit}>
          <h2>Nhập thông tin tra cứu</h2>
          <label>
            Mã phản hồi
            <input
              name="ticketCode"
              placeholder="Vd: PH-A7K9QX"
              autoCapitalize="characters"
              required
            />
          </label>
          <label>
            Số điện thoại đã dùng khi gửi
            <input name="phone" placeholder="Nhập số điện thoại" required />
          </label>
          <button type="submit" disabled={isLoading}>
            <Icon icon="zi-search" />
            <span>{isLoading ? "Đang tra cứu..." : "Tra cứu"}</span>
          </button>
          {error && <p className="feedback-form__message--error">{error}</p>}
        </form>

        {result && (
          <section className="feedback-lookup-result">
            <div className="feedback-lookup-result__head">
              <span>{result.ticketCode}</span>
              <span
                className={`feedback-status-badge feedback-status-badge--${result.status}`}
              >
                {STATUS_LABELS[result.status]}
              </span>
            </div>
            {result.channel && (
              <p className="feedback-card__category">
                {result.channel.category} · {result.channel.title}
              </p>
            )}
            <p className="feedback-detail__paragraph">{result.content}</p>
            <FeedbackTicketAttachments attachments={result.attachments} />
            <p className="feedback-lookup-result__meta">
              Đã gửi lúc {formatDateTime(result.createdAt)}
            </p>
            {result.status === "resolved" && result.resolvedAt && (
              <p className="feedback-lookup-result__meta">
                Đã xử lý xong lúc {formatDateTime(result.resolvedAt)}
              </p>
            )}
          </section>
        )}

        <section
          className="feedback-my-tickets"
          aria-labelledby="feedback-my-tickets-title"
        >
          <div className="feedback-my-tickets__heading">
            <div>
              <span>Lịch sử đã gửi</span>
              <h2 id="feedback-my-tickets-title">Phản hồi của bạn</h2>
            </div>
            {!isMyTicketsLoading && !myTicketsError && (
              <span>{myTickets.length} phản hồi</span>
            )}
          </div>

          {isMyTicketsLoading && (
            <div className="feedback-my-tickets__state" role="status">
              <Spinner />
              <p>Đang tải phản hồi của bạn...</p>
            </div>
          )}

          {authStatus === "idle" && !isMyTicketsLoading && (
            <div className="feedback-my-tickets__state">
              <Icon icon="zi-user" />
              <p>Đăng nhập bằng Zalo để xem phản hồi bạn đã gửi.</p>
              <button type="button" onClick={retryMyTickets}>
                Đăng nhập bằng Zalo
              </button>
            </div>
          )}

          {!isMyTicketsLoading && myTicketsError && (
            <div
              className="feedback-my-tickets__state feedback-my-tickets__state--error"
              role="alert"
            >
              <Icon icon="zi-warning-circle" />
              <p>{myTicketsError.message}</p>
              {myTicketsError.retryable && (
                <button type="button" onClick={retryMyTickets}>
                  {myTicketsUnauthorized ? "Đăng nhập lại" : "Thử lại"}
                </button>
              )}
            </div>
          )}

          {authStatus !== "idle" &&
            !isMyTicketsLoading &&
            !myTicketsError &&
            myTickets.length === 0 && (
              <div className="feedback-my-tickets__state">
                <Icon icon="zi-chat" />
                <p>Bạn chưa gửi phản hồi nào.</p>
              </div>
            )}

          {authStatus !== "idle" && !isMyTicketsLoading && !myTicketsError && myTickets.length > 0 && (
            <div className="feedback-my-tickets__list">
              {myTickets.map((ticket) => (
                <article
                  className="feedback-my-ticket"
                  key={ticket.ticketCode}
                >
                  <div className="feedback-lookup-result__head">
                    <span>{ticket.ticketCode}</span>
                    <span
                      className={`feedback-status-badge feedback-status-badge--${ticket.status}`}
                    >
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </div>
                  {ticket.channel && (
                    <p className="feedback-card__category">
                      {ticket.channel.category} · {ticket.channel.title}
                    </p>
                  )}
                  <p className="feedback-detail__paragraph">
                    {ticket.content}
                  </p>
                  <FeedbackTicketAttachments attachments={ticket.attachments} />
                  <p className="feedback-lookup-result__meta">
                    Đã gửi lúc {formatDateTime(ticket.createdAt)}
                  </p>
                  {ticket.status === "resolved" && ticket.resolvedAt && (
                    <p className="feedback-lookup-result__meta">
                      Đã xử lý xong lúc {formatDateTime(ticket.resolvedAt)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </Page>
  );
}

export default FeedbackLookupPage;
