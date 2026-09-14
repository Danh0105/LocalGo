import { useCallback, useEffect, useRef, useState } from "react";

import { ApiRequestError, getApiErrorMessage } from "@/lib/http-client";
import { sendChatbotMessage } from "@/services/chat";
import type { ChatbotHistoryMessage, ChatMessage } from "@/types/chat";

const MESSAGE_MAX_LENGTH = 4_000;
const HISTORY_LIMIT = 10;
const STORAGE_KEY = "localgo.chatbot.messages";

function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChatMessage>;
  return (
    typeof candidate.id === "string" &&
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function loadStoredMessages(): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isChatMessage) : [];
  } catch {
    return [];
  }
}

function persistMessages(messages: ChatMessage[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // localStorage may be unavailable (private mode, quota) — history stays in-memory only.
  }
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 429) {
      return "Bạn gửi tin nhắn quá nhanh. Vui lòng thử lại sau.";
    }
    if (error.status === 503) {
      return "Trợ lý đang tạm thời gián đoạn. Vui lòng thử lại.";
    }
    if (error.code === "CLIENT_TIMEOUT" || error.code === "NETWORK_ERROR") {
      return "Mất kết nối hoặc hết thời gian chờ. Vui lòng thử lại.";
    }
  }
  return getApiErrorMessage(error);
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadStoredMessages(),
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [failedMessage, setFailedMessage] = useState("");

  const isSendingRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    persistMessages(messages);
  }, [messages]);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const performSend = useCallback(
    async (
      content: string,
      appendUserMessage: boolean,
      historyMessages: ChatMessage[],
    ) => {
      if (isSendingRef.current) return;

      const controller = new AbortController();
      controllerRef.current = controller;
      isSendingRef.current = true;
      setIsSending(true);
      setError("");
      setFailedMessage("");

      const history: ChatbotHistoryMessage[] = historyMessages
        .slice(-HISTORY_LIMIT)
        .map((message) => ({ role: message.role, content: message.content }));

      if (appendUserMessage) {
        setMessages((current) => [
          ...current,
          {
            id: createMessageId(),
            role: "user",
            content,
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      try {
        const result = await sendChatbotMessage(
          content,
          history,
          controller.signal,
        );
        if (controller.signal.aborted) return;

        setMessages((current) => [
          ...current,
          {
            id: createMessageId(),
            role: "assistant",
            content: result.message,
            createdAt: new Date().toISOString(),
          },
        ]);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(resolveErrorMessage(requestError));
        setFailedMessage(content);
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          isSendingRef.current = false;
          setIsSending(false);
        }
      }
    },
    [],
  );

  const sendMessage = useCallback(
    (rawContent: string): boolean => {
      const content = rawContent.trim();
      if (!content || isSendingRef.current) return false;
      if (content.length > MESSAGE_MAX_LENGTH) {
        setError(`Tin nhắn không được vượt quá ${MESSAGE_MAX_LENGTH} ký tự.`);
        return false;
      }

      void performSend(content, true, messages);
      return true;
    },
    [messages, performSend],
  );

  const retry = useCallback(() => {
    if (!failedMessage || isSendingRef.current) return;
    void performSend(failedMessage, false, messages.slice(0, -1));
  }, [failedMessage, messages, performSend]);

  const clearConversation = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    isSendingRef.current = false;
    setIsSending(false);
    setMessages([]);
    setError("");
    setFailedMessage("");
  }, []);

  return {
    messages,
    isSending,
    error,
    canRetry: !!failedMessage,
    sendMessage,
    retry,
    clearConversation,
  };
}
