/** Adapter for resident-to-admin conversations. Verify endpoint routes against NestJS controllers. */
export interface ResidentChatMessage {
  id: string;
  senderRole: 'user' | 'admin';
  senderName?: string;
  content: string;
  attachments?: { id: string; url: string; mimeType?: string | null; name?: string | null }[];
  createdAt: string;
}

export interface ResidentChatTransport {
  list: (ticketId: string, accessToken: string, signal?: AbortSignal) => Promise<ResidentChatMessage[]>;
  send: (ticketId: string, accessToken: string, body: { content: string; mediaIds?: string[] }) => Promise<ResidentChatMessage>;
  markRead?: (ticketId: string, accessToken: string) => Promise<void>;
}

let transport: ResidentChatTransport | undefined;
export function configureResidentFeedbackChat(client: ResidentChatTransport): void { transport = client; }
export function getResidentFeedbackChat(): ResidentChatTransport | undefined { return transport; }
