import { FormEvent, useEffect, useMemo, useState } from "react";
import { Icon, Modal, Page, useNavigate, useParams } from "zmp-ui";

import { useCurrentUser } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notification-context";
import {
  TradeConversationResponse,
  TradeMessageResponse,
  TradePostRequestError,
  getTradeConversations,
  getTradeMessages,
  markTradeConversationRead,
  sendTradeMessage,
} from "@/services/trade-posts";
import restaurant from "@/static/restaurant.png";
import "../css/pages/trade-management.css";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function message(error: unknown, fallback: string): string {
  return error instanceof TradePostRequestError || error instanceof Error
    ? error.message
    : fallback;
}

function TradeMessagesPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, accessToken, status, authenticate } = useCurrentUser();
  const { subscribeToChatMessages } = useNotifications();
  const [conversations, setConversations] = useState<TradeConversationResponse[]>([]);
  const [messages, setMessages] = useState<TradeMessageResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const conversation = useMemo(
    () => conversations.find((item) => item.id === id),
    [conversations, id]
  );

  useEffect(() => {
    if (status === "idle" || status === "error") setLoginOpen(true);
  }, [status]);

  useEffect(() => {
    if (!accessToken || status !== "authenticated" || !id) return;
    let active = true;
    setIsLoading(true);
    setError("");
    void (async () => {
      try {
        const list = await getTradeConversations(accessToken);
        if (!active) return;
        setConversations(list);
        if (!list.some((item) => item.id === id)) {
          throw new TradePostRequestError("Không tìm thấy hội thoại này.", 404);
        }
        const result = await getTradeMessages(accessToken, id, 1, 100);
        if (!active) return;
        setMessages(result.items);
        await markTradeConversationRead(accessToken, id);
      } catch (requestError) {
        if (active) setError(message(requestError, "Không thể tải hội thoại."));
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [accessToken, id, status]);

  useEffect(() => {
    if (!id) return;
    return subscribeToChatMessages((event) => {
      if (event.conversationId !== id) return;
      setMessages((current) =>
        current.some((item) => item.id === event.message.id)
          ? current
          : [...current, event.message]
      );
      setConversations((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                lastMessage: event.message,
                lastMessageAt: event.message.createdAt,
                unreadCount: 0,
              }
            : item
        )
      );
      if (accessToken && event.message.senderId !== user?.id) {
        void markTradeConversationRead(accessToken, id).catch(() => undefined);
      }
    });
  }, [accessToken, id, subscribeToChatMessages, user?.id]);

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      await authenticate({ requestUserInfoPermission: true });
      setLoginOpen(false);
    } catch (requestError) {
      setLoginError(message(requestError, "Không thể đăng nhập Zalo."));
    } finally {
      setLoginLoading(false);
    }
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !id || isSending) return;
    const form = event.currentTarget;
    const content = String(new FormData(form).get("message") ?? "").trim();
    if (!content) return;
    setIsSending(true);
    setError("");
    try {
      const result = await sendTradeMessage(accessToken, id, content);
      setMessages((current) => [...current, result]);
      form.reset();
    } catch (requestError) {
      setError(message(requestError, "Không thể gửi tin nhắn."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Page className="trade-manager-page trade-chat-page">
      <header className="trade-manager__header">
        <div className="trade-manager__topbar">
          <button type="button" aria-label="Quay lại" onClick={() => navigate(-1)}>
            <Icon icon="zi-arrow-left" />
          </button>
          <div>
            <span>Trao đổi giao thương</span>
            <h1>{conversation?.counterpart.displayName || "Tin nhắn"}</h1>
          </div>
          {conversation && (
            <button className="trade-manager__create" type="button" onClick={() => navigate(`/trade/${encodeURIComponent(conversation.tradePost.slug)}`)}>
              Xem tin
            </button>
          )}
        </div>
        {conversation && (
          <div className="trade-chat__post">
            <img src={conversation.tradePost.thumbnailUrl || restaurant} alt="" />
            <div>
              <small>Đang trao đổi về</small>
              <strong>{conversation.tradePost.title}</strong>
            </div>
          </div>
        )}
      </header>

      <main className="trade-manager__content trade-chat__content">
        {error && <p className="trade-manager__action-error" role="alert">{error}</p>}
        <section className="trade-manager__thread trade-chat__thread">
          <div className="trade-manager__message-list">
            {isLoading && <p>Đang tải tin nhắn...</p>}
            {!isLoading && messages.length === 0 && !error && (
              <div className="trade-manager__empty">
                <Icon icon="zi-chat" />
                <strong>Hãy bắt đầu cuộc trò chuyện</strong>
              </div>
            )}
            {messages.map((item) => (
              <article className={item.senderId === user?.id ? "is-mine" : ""} key={item.id}>
                <p>{item.content}</p>
                <time>{formatTime(item.createdAt)}</time>
              </article>
            ))}
          </div>
          {conversation && (
            <form className="trade-manager__composer" onSubmit={submitMessage}>
              <input name="message" maxLength={1000} autoComplete="off" placeholder="Nhập tin nhắn..." />
              <button type="submit" disabled={isSending} aria-label="Gửi tin nhắn">
                <Icon icon="zi-send-solid" />
              </button>
            </form>
          )}
        </section>
      </main>

      <Modal
        visible={loginOpen}
        title="Đăng nhập để nhắn tin"
        description={loginError || "Bạn cần đăng nhập Zalo để trao đổi an toàn với người đăng tin."}
        maskClosable={!loginLoading}
        onClose={() => navigate("/trade", { replace: true })}
        actionsDivider
        actions={[
          { key: "later", text: "Để sau", disabled: loginLoading, onClick: () => navigate("/trade", { replace: true }) },
          { key: "login", text: loginLoading ? "Đang đăng nhập..." : "Đăng nhập Zalo", highLight: true, disabled: loginLoading, onClick: () => void handleLogin() },
        ]}
      />
    </Page>
  );
}

export default TradeMessagesPage;
