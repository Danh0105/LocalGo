import { useEffect, useRef, useState } from "react";
import { Icon, Modal, Page } from "zmp-ui";

import { requestAppBack } from "@/components/app-back-handler";
import ChatComposer from "@/components/chat/chat-composer";
import MessageBubble from "@/components/chat/message-bubble";
import SuggestedQuestions from "@/components/chat/suggested-questions";
import { useChat } from "@/hooks/use-chat";
import robotImage from "@/static/robot.png";
import type { ChatMessage } from "@/types/chat";
import "@/css/pages/chat.css";

const GREETING_TEXT =
  "Xin chào! Tôi là trợ lý du lịch LocalGo. Bạn có thể hỏi tôi về địa điểm tham quan, đặc sản, ẩm thực, lễ hội và tour trải nghiệm tại Truông Mít.";

const GREETING_MESSAGE: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content: GREETING_TEXT,
  createdAt: new Date(0).toISOString(),
};

const STARTER_QUESTIONS = [
  "Truông Mít có đặc sản gì?",
  "Gợi ý địa điểm tham quan",
  "Có tour trải nghiệm nào?",
  "Tôi có thể mua sản phẩm OCOP ở đâu?",
];

function ChatPage() {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const chat = useChat();

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: chat.isSending ? "smooth" : "auto",
        block: "end",
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [chat.isSending, chat.messages.length]);

  const hasMessages = chat.messages.length > 0;

  return (
    <Page className="chat-page">
      <header className="chat-header">
        <button
          className="chat-header__back"
          type="button"
          aria-label="Quay lại"
          onClick={requestAppBack}
        >
          <Icon icon="zi-arrow-left" />
        </button>

        <div className="chat-header__title">
          <img src={robotImage} alt="" />
          <div>
            <h1>Trợ lý du lịch LocalGo</h1>
            <span className="chat-header__status">
              <i aria-hidden="true" />
              {chat.isSending ? "Đang trả lời..." : "Luôn sẵn sàng hỗ trợ"}
            </span>
          </div>
        </div>

        <div className="chat-header__actions">
          <button
            type="button"
            aria-label="Xóa cuộc trò chuyện"
            disabled={!hasMessages}
            onClick={() => setConfirmClearOpen(true)}
          >
            <Icon icon="zi-delete" />
          </button>
        </div>
      </header>

      <main className="chat-thread" aria-live="polite">
        {!hasMessages ? (
          <section className="chat-welcome">
            <div className="chat-welcome__hero" aria-hidden="true">
              <span className="chat-welcome__orbit chat-welcome__orbit--one" />
              <span className="chat-welcome__orbit chat-welcome__orbit--two" />
              <div className="chat-welcome__icon">
                <img src={robotImage} alt="" />
              </div>
            </div>
            <span className="chat-welcome__eyebrow">LOCALGO AI</span>
            <h2>Trợ lý du lịch LocalGo</h2>
            <p className="chat-welcome__description">{GREETING_TEXT}</p>
            <SuggestedQuestions
              label="Bạn có thể hỏi"
              questions={STARTER_QUESTIONS}
              disabled={chat.isSending}
              onSelect={(question) => chat.sendMessage(question)}
            />
          </section>
        ) : (
          <MessageBubble message={GREETING_MESSAGE} />
        )}

        {chat.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {chat.isSending && (
          <div className="chat-typing" role="status" aria-label="Đang trả lời...">
            <img src={robotImage} alt="" />
            <div>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </div>
            <p>Đang trả lời...</p>
          </div>
        )}

        {!chat.isSending && chat.error && (
          <div className="chat-error" role="alert">
            <Icon icon="zi-warning-circle" />
            <div>
              <p>{chat.error}</p>
              {chat.canRetry && (
                <button type="button" onClick={chat.retry}>
                  Thử lại
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} className="chat-thread__bottom" />
      </main>

      <ChatComposer isSending={chat.isSending} onSend={chat.sendMessage} />

      <Modal
        visible={confirmClearOpen}
        title="Xóa cuộc trò chuyện?"
        description="Toàn bộ tin nhắn trong cuộc trò chuyện này sẽ bị xóa và không thể khôi phục."
        maskClosable
        onClose={() => setConfirmClearOpen(false)}
        actions={[
          {
            key: "cancel",
            text: "Hủy",
            onClick: () => setConfirmClearOpen(false),
          },
          {
            key: "delete",
            text: "Xóa",
            danger: true,
            onClick: () => {
              chat.clearConversation();
              setConfirmClearOpen(false);
            },
          },
        ]}
      />
    </Page>
  );
}

export default ChatPage;
