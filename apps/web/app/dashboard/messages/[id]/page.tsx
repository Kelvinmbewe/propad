
import { ChatWindow } from '@/features/messaging/components/ChatWindow';

export default function ChatPage({ params }: { params: { id: string } }) {
    return <ChatWindow conversationId={params.id} />;
}
