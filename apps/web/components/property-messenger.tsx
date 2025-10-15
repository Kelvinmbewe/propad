'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, cn, notify } from '@propad/ui';
import type { PropertyMessage } from '@propad/sdk';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

const timestampFormatter = new Intl.DateTimeFormat('en-ZW', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function formatTimestamp(value: string) {
  try {
    return timestampFormatter.format(new Date(value));
  } catch (error) {
    return value;
  }
}

interface PropertyMessengerProps {
  propertyId: string;
  landlordId?: string | null;
  agentOwnerId?: string | null;
  className?: string;
}

export function PropertyMessenger({ propertyId, landlordId, agentOwnerId, className }: PropertyMessengerProps) {
  const { data: session } = useSession();
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const userId = session?.user?.id;
  const role = session?.user?.role;
  const isLandlord = role === 'LANDLORD' && landlordId && landlordId === userId;
  const isAgent = role === 'AGENT' && agentOwnerId && agentOwnerId === userId;
  const isParticipant = Boolean((sdk && userId && (isLandlord || isAgent)) ?? false);
  const hasAssignedAgent = Boolean(agentOwnerId);

  const { data: messages, isLoading, isError } = useQuery({
    queryKey: ['property', propertyId, 'messages'],
    queryFn: () => sdk!.properties.listMessages(propertyId),
    enabled: isParticipant,
    refetchInterval: 15000
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => sdk!.properties.sendMessage(propertyId, { body }),
    onSuccess: () => {
      setMessage('');
      notify.success('Message sent');
      queryClient.invalidateQueries({ queryKey: ['property', propertyId, 'messages'] });
    },
    onError: (error: unknown) => {
      const fallback = 'Unable to send message right now';
      if (error instanceof Error) {
        notify.error(error.message || fallback);
      } else {
        notify.error(fallback);
      }
    }
  });

  if (!isParticipant) {
    return null;
  }

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      notify.error('Write a message before sending');
      return;
    }

    sendMutation.mutate(trimmed);
  };

  const canSend = isAgent || (isLandlord && hasAssignedAgent);

  return (
    <div className={cn('space-y-4 rounded-lg border border-neutral-200 p-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">
          In-app chat with your {isLandlord ? 'agent' : 'landlord'}
        </h3>
        {!hasAssignedAgent && isLandlord ? (
          <span className="text-xs text-orange-600">Assign a verified agent to start chatting.</span>
        ) : null}
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto rounded-md bg-neutral-50 p-3 text-sm">
        {isLoading ? (
          <p className="text-neutral-500">Loading conversation…</p>
        ) : isError ? (
          <p className="text-red-600">Unable to load messages right now.</p>
        ) : !messages || messages.length === 0 ? (
          <p className="text-neutral-500">No messages yet. Start the conversation below.</p>
        ) : (
          messages.map((item: PropertyMessage) => {
            const isMine = item.senderId === userId;
            return (
              <div key={item.id} className={cn('flex flex-col gap-1', isMine ? 'items-end text-right' : 'items-start text-left')}>
                <span
                  className={cn(
                    'inline-block max-w-[80%] rounded-lg px-3 py-2',
                    isMine ? 'bg-emerald-600 text-white' : 'bg-white text-neutral-900 shadow'
                  )}
                >
                  {item.body}
                </span>
                <span className="text-xs text-neutral-500">{formatTimestamp(item.createdAt)}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm focus:border-neutral-500 focus:outline-none"
          placeholder={
            canSend
              ? 'Type your message to keep communications on PropAd'
              : 'Assign a verified agent before starting an in-app chat'
          }
          disabled={!canSend || sendMutation.isPending}
        />
        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={!canSend || sendMutation.isPending}>
            {sendMutation.isPending ? 'Sending…' : 'Send message'}
          </Button>
        </div>
      </div>
    </div>
  );
}
