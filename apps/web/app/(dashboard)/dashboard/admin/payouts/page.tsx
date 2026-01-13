'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Textarea,
  notify
} from '@propad/ui';
import { formatCurrency } from '@/lib/formatters';
import { Loader2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useSdkClient } from '@/hooks/use-sdk-client';
import { ClientState } from '@/components/client-state';

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const { sdk, status, message } = useSdkClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: payouts, isLoading, isError } = useQuery({
    queryKey: ['admin-payouts'],
    enabled: status === 'ready',
    queryFn: async () => {
      if (!sdk) {
        return [];
      }
      return sdk.admin.payouts.list();
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!sdk) {
        throw new Error('Payout client not ready');
      }
      return sdk.admin.payouts.approve(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      notify.success('Payout request approved for processing.');
    },
    onError: () => {
      notify.error('Failed to approve payout request.');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      sdk ? sdk.admin.payouts.reject(id, reason) : Promise.reject(new Error('Payout client not ready')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      notify.success('Payout request rejected.');
      setRejectId(null);
      setRejectReason('');
    },
    onError: () => {
      notify.error('Failed to reject payout request.');
    }
  });

  const handleRejectSubmit = () => {
    if (rejectId && rejectReason) {
      rejectMutation.mutate({ id: rejectId, reason: rejectReason });
    }
  };

  const pendingPayouts = payouts?.filter(p => ['REQUESTED', 'REVIEW'].includes(p.status)) || [];
  const approvedPayouts = payouts?.filter(p => p.status === 'APPROVED') || [];

  // Payouts that are ready to be EXECUTED (Approved).
  // In this simple UI, we might just list them separately or auto-execute?
  // Our backend logic says Approve -> APPROVED.
  // Then separate step to Process/Execute.
  // We should add a "Process" button for Approved payouts if we want manual control.
  // Or maybe "Approve" moves to APPROVED, and then a cron picks it up?
  // The plan said: "Approve -> IN_PROGRESS". Current code: Approve -> APPROVED.
  // Then `processPayout` -> SENT.
  // Let's add a "Process" button for Approved items? Or just assume Approve is enough?
  // The Controller has `executePayout` (via processPayout).
  // I'll add "Process" action for APPROVED items.

  const processMutation = useMutation({
    mutationFn: (id: string) =>
      sdk ? sdk.admin.payouts.process(id, `MANUAL-${Date.now()}`) : Promise.reject(new Error('Payout client not ready')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      notify.success('Payout sent to gateway.');
    },
    onError: () => {
      notify.error('Failed to process payout.');
    }
  });

  if (status !== 'ready') {
    return <ClientState status={status} message={message} title="Payout approvals" />;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Payout Requests</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Pending Approval ({pendingPayouts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-600">
                Unable to load payouts right now. Please try again.
              </div>
            ) : pendingPayouts.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No pending requests</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{format(new Date(payout.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{payout.wallet?.ownerId}</span>
                          <span className="text-xs text-muted-foreground">{payout.wallet?.ownerType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(payout.amountCents / 100)}</TableCell>
                      <TableCell><Badge variant="outline">{payout.method}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {payout.payoutAccount?.displayName}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRejectId(payout.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => approveMutation.mutate(payout.id)}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {approvedPayouts.length > 0 && (
          <Card className="col-span-7">
            <CardHeader>
              <CardTitle>Ready for Processing ({approvedPayouts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{format(new Date(payout.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{payout.wallet?.ownerId}</TableCell>
                      <TableCell>{formatCurrency(payout.amountCents / 100)}</TableCell>
                      <TableCell><Badge variant="outline">{payout.method}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => processMutation.mutate(payout.id)}
                          disabled={processMutation.isPending}
                        >
                          {processMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Execute Payout'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payout request. This will be visible to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleRejectSubmit}
                disabled={!rejectReason || rejectMutation.isPending}
              >
                {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
