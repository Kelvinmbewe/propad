'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@propad/ui';
import { Button } from '@propad/ui';
import { useAuthenticatedSDK } from '../../../../../../hooks/use-authenticated-sdk';
import { PayoutRequest } from '@propad/sdk';
import { toast } from 'sonner';

export default function AdminPayoutsPage() {
  const sdk = useAuthenticatedSDK();
  const [requests, setRequests] = useState<(PayoutRequest & { wallet: { user: any } })[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const data = await sdk.payouts.getAllPayouts();
      setRequests(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await sdk.payouts.approvePayout(id);
      toast.success('Payout approved');
      fetchRequests();
    } catch (e: any) {
      toast.error('Failed to approve payout');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-white">Payout Management</h1>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="pb-2">User</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="py-3">{r.wallet?.user?.email || 'Unknown'}</td>
                    <td className="py-3 font-medium text-green-400">${(r.amountCents / 100).toFixed(2)}</td>
                    <td className="py-3">{r.method}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'PAID' ? 'bg-green-500/20 text-green-400' :
                        r.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      {r.status === 'REQUESTED' && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(r.id)}
                          disabled={processing === r.id}
                        >
                          {processing === r.id ? '...' : 'Approve'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && <p className="text-center py-4 text-gray-500">No payout requests found.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
