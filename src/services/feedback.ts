import {
  FeedbackCategory,
  FeedbackChannel,
  feedbackChannels,
} from "@/data/feedback";

export interface FeedbackQuery {
  category?: FeedbackCategory;
}

export interface FeedbackPayload {
  channelId?: string;
  fullName: string;
  phone: string;
  content: string;
}

export async function getFeedbackChannels(
  query: FeedbackQuery = {}
): Promise<FeedbackChannel[]> {
  const { category } = query;

  return category
    ? feedbackChannels.filter((channel) => channel.category === category)
    : feedbackChannels;
}

export async function getFeedbackChannelById(
  id: string
): Promise<FeedbackChannel | undefined> {
  return feedbackChannels.find((channel) => channel.id === id);
}

export async function submitFeedback(
  payload: FeedbackPayload
): Promise<{ success: true; ticketCode: string }> {
  console.info("Mock feedback payload", payload);

  return {
    success: true,
    ticketCode: `PH-${Date.now().toString().slice(-6)}`,
  };
}
