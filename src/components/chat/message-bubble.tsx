import robotImage from "@/static/robot.png";
import type { ChatMessage } from "@/types/chat";

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type MessageBubbleProps = {
  message: ChatMessage;
};

function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={`chat-message ${
        isAssistant ? "chat-message--assistant" : "chat-message--user"
      }`}
    >
      {isAssistant && (
        <div className="chat-message__avatar" aria-hidden="true">
          <img src={robotImage} alt="" />
        </div>
      )}

      <div className="chat-message__column">
        {isAssistant && <span className="chat-message__author">LocalGo AI</span>}
        <div className="chat-message__bubble">
          <p>{message.content}</p>
        </div>
        <div className="chat-message__meta">
          <time dateTime={message.createdAt}>
            {formatMessageTime(message.createdAt)}
          </time>
        </div>
      </div>
    </article>
  );
}

export default MessageBubble;
