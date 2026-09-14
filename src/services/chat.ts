import { API_CONFIG } from "@/config/api";
import { apiRequest } from "@/lib/http-client";
import type {
  ChatbotHistoryMessage,
  ChatbotRequest,
  ChatbotResponseData,
} from "@/types/chat";

export function sendChatbotMessage(
  message: string,
  history: ChatbotHistoryMessage[],
  signal?: AbortSignal,
): Promise<ChatbotResponseData> {
  const body: ChatbotRequest =
    history.length > 0 ? { message, history } : { message };

  return apiRequest<ChatbotResponseData>("/chatbot/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    timeoutMs: API_CONFIG.chatbotTimeoutMs,
  });
}
