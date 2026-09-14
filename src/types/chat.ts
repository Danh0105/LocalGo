export type ChatbotRole = "user" | "assistant";

export type ChatbotHistoryMessage = {
  role: ChatbotRole;
  content: string;
};

export type ChatbotRequest = {
  message: string;
  history?: ChatbotHistoryMessage[];
};

export type ChatbotResponseData = {
  message: string;
  model: string;
};

export type ChatMessage = {
  id: string;
  role: ChatbotRole;
  content: string;
  createdAt: string;
};
