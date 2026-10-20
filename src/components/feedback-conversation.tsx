import { useCallback, useEffect, useRef, useState } from "react";
import {
  getResidentFeedbackChat,
  type ResidentChatMessage,
} from "@/services/feedback-conversation";
import "../css/components/feedback-conversation.css";

interface Props {
  ticketId?: string;
  ticketCode: string;
  accessToken?: string | null;
  status: string;
}
const time = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN");
};
export default function FeedbackConversation({
  ticketId,
  ticketCode,
  accessToken,
  status,
}: Props) {
  const [messages, setMessages] = useState<ResidentChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const adapter = getResidentFeedbackChat();
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!adapter || !ticketId || !accessToken) return;
      try {
        const data = await adapter.list(ticketId, accessToken, signal);
        if (signal?.aborted) return;
        setMessages(
          [...data].sort(
            (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
          ),
        );
        setError("");
        if (adapter.markRead)
          void adapter.markRead(ticketId, accessToken).catch(() => undefined);
      } catch (e) {
        if (!signal?.aborted)
          setError(e instanceof Error ? e.message : "Không thể tải hội thoại.");
      }
    },
    [adapter, ticketId, accessToken],
  );
  useEffect(() => {
    if (!expanded || !adapter || !ticketId || !accessToken) return;
    const controller = new AbortController();
    setLoading(true);
    void refresh(controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible")
        void refresh(controller.signal);
    }, 15000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [expanded, adapter, ticketId, accessToken, refresh]);
  useEffect(() => {
    if (expanded) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, expanded]);
  const send = async () => {
    const content = draft.trim();
    if (!adapter || !ticketId || !accessToken || !content || sending) return;
    setSending(true);
    setError("");
    try {
      await adapter.send(ticketId, accessToken, { content });
      setDraft("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  };
  return (
    <section
      className="resident-feedback-chat"
      aria-label={`Hội thoại phản hồi ${ticketCode}`}
    >
      <button
        type="button"
        className="resident-feedback-chat__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span>Trao đổi với quản trị viên</span>
        <span>{expanded ? "Thu gọn ▲" : "Mở chat ▼"}</span>
      </button>
      {expanded && (
        <div className="resident-feedback-chat__body">
          {!accessToken ? (
            <p>Đăng nhập Zalo để xem và gửi tin nhắn.</p>
          ) : !ticketId ? (
            <p>
              API chưa trả về ID của phản hồi. Cần bổ sung trường{" "}
              <code>id</code> vào dữ liệu tra cứu.
            </p>
          ) : !adapter ? (
            <p>
              Chưa kết nối API hội thoại phía người dân. Cấu hình adapter trong
              ứng dụng theo README.
            </p>
          ) : (
            <>
              <div className="resident-feedback-chat__toolbar">
                <span>Trao đổi hai chiều</span>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={loading}
                >
                  Làm mới
                </button>
              </div>
              <div
                className="resident-feedback-chat__messages"
                role="log"
                aria-live="polite"
              >
                {loading && <p>Đang tải tin nhắn...</p>}
                {!loading && messages.length === 0 && (
                  <p>Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.</p>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`resident-feedback-chat__bubble resident-feedback-chat__bubble--${message.senderRole}`}
                  >
                    <strong>
                      {message.senderRole === "admin"
                        ? message.senderName || "Quản trị viên"
                        : "Bạn"}
                    </strong>
                    {message.content && <p>{message.content}</p>}
                    {message.attachments?.map((file) =>
                      file.mimeType?.startsWith("image/") ? (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={file.url}
                            alt={file.name || "Ảnh hội thoại"}
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {file.name || "Tệp đính kèm"}
                        </a>
                      ),
                    )}
                    <small>{time(message.createdAt)}</small>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              {error && (
                <p className="resident-feedback-chat__error" role="alert">
                  {error}
                </p>
              )}
              {status === "closed" ? (
                <p>Phản hồi đã đóng, không thể gửi thêm tin nhắn.</p>
              ) : (
                <div className="resident-feedback-chat__composer">
                  <textarea
                    aria-label="Nội dung tin nhắn"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Nhập tin nhắn cho quản trị viên..."
                    maxLength={5000}
                    rows={2}
                  />
                  <button
                    type="button"
                    disabled={!draft.trim() || sending}
                    onClick={() => void send()}
                  >
                    {sending ? "Đang gửi..." : "Gửi"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
