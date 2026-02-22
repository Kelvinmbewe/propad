"use client";

import { MessagesInbox } from "@/features/messaging/components/MessagesInbox";

export default function DashboardMessageThreadPage({
  params,
}: {
  params: { id: string };
}) {
  return <MessagesInbox initialConversationId={params.id} />;
}
