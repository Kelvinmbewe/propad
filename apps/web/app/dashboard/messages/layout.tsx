
import { ConversationList } from '@/features/messaging/components/ConversationList';
import { Card } from '@propad/ui';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-[calc(100vh-4rem)] p-4 gap-4">
            <Card className="w-80 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b font-semibold">Messages</div>
                <ConversationList />
            </Card>
            <Card className="flex-1 h-full overflow-hidden">
                {children}
            </Card>
        </div>
    );
}
