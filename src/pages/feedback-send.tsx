import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Icon, Page, useNavigate, useSearchParams } from "zmp-ui";

import { FeedbackChannel } from "@/data/feedback";
import { useCurrentUser } from "@/contexts/auth-context";
import { FeedbackAttachmentKind, selectFeedbackAttachments } from "@/lib/feedback-attachments";
import { AuthRequestError } from "@/services/auth";
import {
  FeedbackAttachmentUploadError,
  FeedbackSubmitError,
  getFeedbackChannels,
  submitFeedback,
  uploadFeedbackAttachment,
} from "@/services/feedback";
import "../css/pages/feedback.css";

const OTHER_CHANNEL_VALUE = "";

// Mirrors backend validation so most invalid submissions are caught before
// the round-trip; the backend remains the source of truth.
const PHONE_PATTERN = /^\+?[0-9\s]+$/;
const MAX_PHONE_LENGTH = 30;
const MIN_FULL_NAME_LENGTH = 1;
const MAX_FULL_NAME_LENGTH = 150;
const MIN_CONTENT_LENGTH = 5;
const MAX_CONTENT_LENGTH = 5000;

interface SelectedAttachment {
  key: string;
  file: File;
  kind: FeedbackAttachmentKind;
  previewUrl: string;
  status: "uploading" | "uploaded" | "error";
  progress: number;
  mediaId?: string;
  error?: string;
}

function uploadErrorMessage(error: unknown, file: File): string {
  if (error instanceof FeedbackAttachmentUploadError) {
    if (error.code === "IMAGE_SIZE_EXCEEDED") return `${file.name} vượt quá 5MB.`;
    if (error.code === "VIDEO_SIZE_EXCEEDED") return `${file.name} vượt quá 50MB.`;
    if (error.code === "INVALID_FEEDBACK_ATTACHMENT") {
      return `${file.name}: tệp đính kèm không hợp lệ.`;
    }
    return error.message;
  }
  return `${file.name}: không thể tải lên. Vui lòng thử lại.`;
}

const RATE_LIMIT_MESSAGE =
  "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau.";
const CHANNEL_NOT_FOUND_MESSAGE =
  "Kênh phản hồi đã chọn không còn tồn tại hoặc đã ngừng hoạt động. Vui lòng chọn kênh khác hoặc gửi phản hồi chung.";
const GENERIC_SUBMIT_ERROR_MESSAGE =
  "Không thể gửi phản hồi, vui lòng kiểm tra lại thông tin hoặc thử lại sau.";
const LOGIN_REQUIRED_MESSAGE =
  "Không thể đăng nhập Zalo để gửi phản hồi. Vui lòng mở Mini App trong Zalo và thử lại.";

function FeedbackSendPage() {
  const navigate = useNavigate();
  const { authenticate } = useCurrentUser();
  const [searchParams] = useSearchParams();
  const requestedChannelId = searchParams.get("channelId") || "";

  const [channels, setChannels] = useState<FeedbackChannel[]>([]);
  const [channelsError, setChannelsError] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState(
    requestedChannelId
  );
  const [channelNotFound, setChannelNotFound] = useState(false);

  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketCode, setTicketCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const attachmentsRef = useRef<SelectedAttachment[]>([]);
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextAttachmentKeyRef = useRef(0);

  const updateAttachments = (
    update: (current: SelectedAttachment[]) => SelectedAttachment[]
  ) => {
    const next = update(attachmentsRef.current);
    attachmentsRef.current = next;
    setAttachments(next);
  };

  const updateAttachment = (key: string, changes: Partial<SelectedAttachment>) => {
    if (!attachmentsRef.current.some((item) => item.key === key)) return;
    updateAttachments((current) =>
      current.map((item) => (item.key === key ? { ...item, ...changes } : item))
    );
  };

  const startUpload = (attachment: SelectedAttachment) => {
    if (uploadControllersRef.current.has(attachment.key)) return;
    const controller = new AbortController();
    uploadControllersRef.current.set(attachment.key, controller);
    updateAttachment(attachment.key, {
      status: "uploading",
      progress: 0,
      error: undefined,
      mediaId: undefined,
    });
    uploadFeedbackAttachment(
      attachment.file,
      (progress) => updateAttachment(attachment.key, { progress }),
      controller.signal
    )
      .then((uploaded) => {
        if (!controller.signal.aborted) {
          updateAttachment(attachment.key, {
            status: "uploaded",
            progress: 100,
            mediaId: uploaded.id,
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          updateAttachment(attachment.key, {
            status: "error",
            error: uploadErrorMessage(error, attachment.file),
          });
        }
      })
      .finally(() => {
        if (uploadControllersRef.current.get(attachment.key) === controller) {
          uploadControllersRef.current.delete(attachment.key);
        }
      });
  };

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;

    const selection = selectFeedbackAttachments(files, attachmentsRef.current.length);
    setAttachmentErrors(selection.errors);
    if (!selection.accepted.length) return;

    const added = selection.accepted.map(({ file, kind }): SelectedAttachment => ({
      key: String(++nextAttachmentKeyRef.current),
      file,
      kind,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
      progress: 0,
    }));
    updateAttachments((current) => [...current, ...added]);
    added.forEach(startUpload);
  };

  const handleRemoveAttachment = (attachment: SelectedAttachment) => {
    uploadControllersRef.current.get(attachment.key)?.abort();
    uploadControllersRef.current.delete(attachment.key);
    URL.revokeObjectURL(attachment.previewUrl);
    updateAttachments((current) =>
      current.filter((item) => item.key !== attachment.key)
    );
    setAttachmentErrors([]);
  };

  useEffect(() => {
    return () => {
      uploadControllersRef.current.forEach((controller) => controller.abort());
      attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    getFeedbackChannels()
      .then((data) => {
        if (!isActive) return;
        setChannels(data);
        if (
          requestedChannelId &&
          !data.some((channel) => channel.id === requestedChannelId)
        ) {
          setChannelNotFound(true);
          setSelectedChannelId(OTHER_CHANNEL_VALUE);
        }
      })
      .catch(() => {
        if (!isActive) return;
        setChannelsError(true);
      });
    return () => {
      isActive = false;
    };
  }, [requestedChannelId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const fullName = String(formData.get("fullName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const content = String(formData.get("content") || "").trim();

    setSubmitError("");

    if (
      fullName.length < MIN_FULL_NAME_LENGTH ||
      fullName.length > MAX_FULL_NAME_LENGTH
    ) {
      setSubmitError(`Họ tên cần từ 1-${MAX_FULL_NAME_LENGTH} ký tự.`);
      return;
    }
    if (phone.length > MAX_PHONE_LENGTH || !PHONE_PATTERN.test(phone)) {
      setSubmitError("Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }
    if (
      content.length < MIN_CONTENT_LENGTH ||
      content.length > MAX_CONTENT_LENGTH
    ) {
      setSubmitError(
        `Nội dung phản hồi cần từ ${MIN_CONTENT_LENGTH}-${MAX_CONTENT_LENGTH} ký tự.`
      );
      return;
    }
    if (attachmentsRef.current.some((item) => item.status === "uploading")) {
      setSubmitError("Vui lòng đợi ảnh/video tải lên xong rồi gửi phản hồi.");
      return;
    }
    setIsSubmitting(true);
    let hasAuthenticated = false;
    try {
      const { accessToken } = await authenticate();
      hasAuthenticated = true;
      const mediaIds = attachmentsRef.current
        .filter((item) => item.status === "uploaded" && item.mediaId)
        .map((item) => item.mediaId as string);
      const result = await submitFeedback({
        channelId: selectedChannelId || undefined,
        fullName,
        phone,
        content,
        ...(mediaIds.length ? { mediaIds } : {}),
      }, accessToken);
      setTicketCode(result.ticketCode);
      form.reset();
      attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      updateAttachments(() => []);
      setAttachmentErrors([]);
    } catch (requestError: unknown) {
      if (requestError instanceof FeedbackSubmitError) {
        if (requestError.status === 429) {
          setSubmitError(RATE_LIMIT_MESSAGE);
        } else if (requestError.status === 401) {
          setSubmitError("Phiên đăng nhập đã hết hạn. Vui lòng thử gửi lại.");
        } else if (requestError.code === "FEEDBACK_CHANNEL_NOT_FOUND") {
          setSubmitError(CHANNEL_NOT_FOUND_MESSAGE);
          setSelectedChannelId(OTHER_CHANNEL_VALUE);
        } else if (requestError.code === "INVALID_FEEDBACK_ATTACHMENT") {
          setSubmitError("Ảnh/video đính kèm không hợp lệ. Vui lòng xóa tệp lỗi và chọn lại.");
        } else {
          setSubmitError(requestError.message || GENERIC_SUBMIT_ERROR_MESSAGE);
        }
      } else if (requestError instanceof AuthRequestError) {
        setSubmitError(requestError.message || LOGIN_REQUIRED_MESSAGE);
      } else {
        setSubmitError(
          hasAuthenticated ? GENERIC_SUBMIT_ERROR_MESSAGE : LOGIN_REQUIRED_MESSAGE
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTicketCode = async () => {
    try {
      await navigator.clipboard.writeText(ticketCode);
      setCopied(true);
    } catch {
      setCopied(false);
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
          <h1>Gửi phản hồi</h1>
        </div>
      </header>

      <main className="feedback-content">
        {ticketCode ? (
          <section className="feedback-confirm">
            <Icon className="feedback-confirm__icon" icon="zi-check-circle-solid" />
            <h2>Đã gửi phản hồi thành công</h2>
            <p>Vui lòng lưu lại mã dưới đây để tra cứu sau này:</p>
            <div className="feedback-confirm__code">
              <span>{ticketCode}</span>
              <button type="button" onClick={handleCopyTicketCode}>
                <Icon icon={copied ? "zi-check" : "zi-copy"} />
              </button>
            </div>
            {copied && (
              <p className="feedback-confirm__copied">Đã sao chép mã.</p>
            )}
            <p>Bạn có thể dùng mã này để tra cứu lại tiến độ xử lý sau.</p>
            <button
              className="feedback-confirm__done"
              type="button"
              onClick={() => navigate("/feedback/lookup")}
            >
              Xem phản hồi của bạn
            </button>
            <button
              className="feedback-confirm__done"
              type="button"
              onClick={() => navigate("/feedback")}
            >
              Về các kênh phản hồi
            </button>
          </section>
        ) : (
          <form className="feedback-form" onSubmit={handleSubmit}>
            <h2>Thông tin phản hồi</h2>

            <label>
              Kênh phản hồi
              <select
                name="channelId"
                value={selectedChannelId}
                onChange={(event) => setSelectedChannelId(event.target.value)}
              >
                <option value={OTHER_CHANNEL_VALUE}>
                  Khác / Không thuộc kênh nào
                </option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.title}
                  </option>
                ))}
              </select>
            </label>
            {channelNotFound && (
              <p className="feedback-form__message--error">
                {CHANNEL_NOT_FOUND_MESSAGE}
              </p>
            )}
            {channelsError && (
              <p className="feedback-form__message--error">
                Không thể tải danh sách kênh, bạn vẫn có thể gửi phản hồi chung.
              </p>
            )}

            <label>
              Họ tên
              <input
                name="fullName"
                placeholder="Nhập họ tên"
                maxLength={MAX_FULL_NAME_LENGTH}
                required
              />
            </label>
            <label>
              Số điện thoại
              <input
                name="phone"
                placeholder="Nhập số điện thoại"
                maxLength={MAX_PHONE_LENGTH}
                required
              />
            </label>
            <label>
              Nội dung
              <textarea
                name="content"
                placeholder="Nhập nội dung phản hồi"
                maxLength={MAX_CONTENT_LENGTH}
                required
                rows={4}
              />
            </label>
            <section className="feedback-attachments" aria-label="Ảnh và video đính kèm">
              <div className="feedback-attachments__heading">
                <span>Ảnh/video đính kèm (không bắt buộc)</span>
                <span>{attachments.length}/10</span>
              </div>
              <input
                ref={fileInputRef}
                className="feedback-attachments__input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                multiple
                onChange={handleFilesSelected}
                aria-label="Chọn ảnh hoặc video đính kèm"
              />
              <button
                className="feedback-attachments__pick"
                type="button"
                disabled={isSubmitting}
                onClick={() => fileInputRef.current?.click()}
              >
                <span aria-hidden="true">＋</span> Chọn ảnh/video
              </button>
              <p className="feedback-attachments__hint">
                Tối đa 10 tệp. Ảnh JPG, PNG, WebP ≤ 5MB; video MP4, MOV, WebM ≤ 50MB.
              </p>
              {attachmentErrors.length > 0 && (
                <div className="feedback-attachments__errors" role="alert">
                  {attachmentErrors.map((message, index) => (
                    <p key={`${index}-${message}`}>{message}</p>
                  ))}
                </div>
              )}
              {attachments.length > 0 && (
                <ul className="feedback-attachments__list">
                  {attachments.map((attachment) => (
                    <li className="feedback-attachments__item" key={attachment.key}>
                      <div className="feedback-attachments__preview">
                        {attachment.kind === "image" ? (
                          <img src={attachment.previewUrl} alt="" />
                        ) : (
                          <video src={attachment.previewUrl} muted playsInline preload="metadata" />
                        )}
                        {attachment.kind === "video" && (
                          <span className="feedback-attachments__video-icon" aria-label="Video">▶</span>
                        )}
                        <button
                          className="feedback-attachments__remove"
                          type="button"
                          disabled={isSubmitting}
                          aria-label={`Xóa ${attachment.file.name}`}
                          onClick={() => handleRemoveAttachment(attachment)}
                        >
                          ×
                        </button>
                      </div>
                      <span className="feedback-attachments__name" title={attachment.file.name}>
                        {attachment.file.name}
                      </span>
                      <span className={`feedback-attachments__status feedback-attachments__status--${attachment.status}`}>
                        {attachment.status === "uploading"
                          ? `Đang tải ${attachment.progress}%`
                          : attachment.status === "uploaded"
                            ? "Đã tải lên"
                            : "Tải lên lỗi"}
                      </span>
                      {attachment.status === "uploading" && (
                        <span className="feedback-attachments__progress" aria-hidden="true">
                          <span style={{ width: `${attachment.progress}%` }} />
                        </span>
                      )}
                      {attachment.error && (
                        <span className="feedback-attachments__item-error" role="alert">
                          {attachment.error}
                        </span>
                      )}
                      {attachment.status === "error" && (
                        <button
                          className="feedback-attachments__retry"
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => startUpload(attachment)}
                        >
                          Thử lại
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {attachments.some((item) => item.status === "error") && (
                <p className="feedback-attachments__failed-hint">
                  Tệp tải lên lỗi sẽ không được đính kèm. Bạn có thể thử lại hoặc xóa tệp.
                </p>
              )}
            </section>
            <button
              type="submit"
              disabled={isSubmitting || attachments.some((item) => item.status === "uploading")}
            >
              <Icon icon="zi-send-solid" />
              <span>{isSubmitting ? "Đang gửi..." : "Gửi phản hồi"}</span>
            </button>
            {submitError && (
              <p className="feedback-form__message--error">{submitError}</p>
            )}
          </form>
        )}
      </main>
    </Page>
  );
}

export default FeedbackSendPage;
