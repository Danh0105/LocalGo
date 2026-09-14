import { useEffect, useRef, useState } from "react";
import { Icon } from "zmp-ui";

const QUESTION_MAX_LENGTH = 4_000;

type ChatComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  onSend: (question: string) => boolean;
};

function ChatComposer({
  disabled = false,
  isSending = false,
  onSend,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    const element = textAreaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 112)}px`;
  }, [value]);

  const submit = () => {
    const question = value.trim();
    if (!question || disabled || isSending) return;
    if (onSend(question)) setValue("");
  };

  return (
    <footer className="chat-composer">
      <div className="chat-composer__content">
        <div className="chat-composer__row">
          <div className="chat-composer__field">
            <textarea
              ref={textAreaRef}
              aria-label="Nhập tin nhắn cho trợ lý du lịch LocalGo"
              disabled={disabled}
              maxLength={QUESTION_MAX_LENGTH}
              placeholder="Bạn muốn khám phá điều gì?"
              rows={1}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !isComposingRef.current
                ) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            {value.length >= 3_800 && (
              <span className="chat-composer__count">
                {value.length}/{QUESTION_MAX_LENGTH}
              </span>
            )}
          </div>

          <button
            className="chat-composer__send"
            type="button"
            aria-label="Gửi tin nhắn"
            disabled={disabled || isSending || !value.trim()}
            onClick={submit}
          >
            <Icon icon="zi-send-solid" />
          </button>
        </div>

        <p className="chat-composer__notice">
          <Icon icon="zi-info-circle" />
          AI có thể chưa chính xác. Hãy kiểm tra lại thông tin quan trọng.
        </p>
      </div>
    </footer>
  );
}

export default ChatComposer;
