export type ConversationType = "LISTING_CHAT" | "GENERAL_CHAT";
export type ChatRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";

export interface MessagingUser {
  id: string;
  name?: string | null;
  profilePhoto?: string | null;
  role?: string | null;
  trustScore?: number | null;
  verificationScore?: number | null;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  conversationId: string;
  lastReadAt?: string | null;
  user?: MessagingUser;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: MessagingUser;
}

export interface ChatRequest {
  id: string;
  conversationId: string;
  requesterId: string;
  recipientId: string;
  status: ChatRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListingPreview {
  id: string;
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  listingIntent?: string | null;
  media?: Array<{ url: string }>;
  suburb?: { name?: string | null } | null;
  city?: { name?: string | null } | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  propertyId?: string | null;
  listingId?: string | null;
  lastMessageAt?: string | null;
  participants: ConversationParticipant[];
  messages?: ConversationMessage[];
  unreadCount?: number;
  property?: ConversationListingPreview | null;
  chatRequest?: ChatRequest | null;
}
