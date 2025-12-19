'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button, notify } from '@propad/ui';
import { acceptInterest } from '@/app/actions/landlord';

interface InterestActionsProps {
  interestId: string;
  propertyId: string;
  status: string;
  landlordId?: string | null;
  agentOwnerId?: string | null;
}

export function InterestActions({ interestId, propertyId, status, landlordId, agentOwnerId }: InterestActionsProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await acceptInterest(interestId);
      if (result.error) {
        notify.error(result.error);
      } else {
        notify.success('Interest accepted successfully');
        router.refresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept interest';
      notify.error(errorMessage);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {status === 'PENDING' && (
        <Button
          onClick={handleAccept}
          disabled={isAccepting}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isAccepting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Accepting...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Accept
            </>
          )}
        </Button>
      )}
      <Link
        href={`/properties/${propertyId}#chat`}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        onClick={(e) => {
          // Scroll to chat section after navigation
          setTimeout(() => {
            const chatElement = document.getElementById('chat');
            if (chatElement) {
              chatElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }}
      >
        <MessageSquare className="h-4 w-4" />
        Chat
      </Link>
    </div>
  );
}

