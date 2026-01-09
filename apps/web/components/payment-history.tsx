'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Skeleton } from '@propad/ui';
import { formatCurrency } from '@/lib/formatters';
import { Receipt, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';

interface Invoice {
  id: string;
  invoiceNo?: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID';
  amountCents: number;
  currency: string;
  createdAt: string;
  lines: Array<{
    description: string;
    metaJson?: {
      featureType?: string;
      featureId?: string;
    };
  }>;
  paymentTransactions?: Array<{
    id: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    gatewayRef?: string;
  }>;
}

const getFeatureName = (featureType?: string): string => {
  if (!featureType) return 'Unknown';
  const names: Record<string, string> = {
    PROPERTY_VERIFICATION: 'Property Verification',
    AGENT_ASSIGNMENT: 'Agent Assignment',
    FEATURED_LISTING: 'Featured Listing',
    TRUST_BOOST: 'Trust Boost',
    IN_HOUSE_ADVERT_BUYING: 'In-House Ad (Buying)',
    IN_HOUSE_ADVERT_SELLING: 'In-House Ad (Selling)',
    PREMIUM_VERIFICATION: 'Premium Verification'
  };
  return names[featureType] || featureType;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Paid
        </Badge>
      );
    case 'OPEN':
    case 'PENDING':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function PaymentHistory() {
  const sdk = useAuthenticatedSDK();
  const { data: session } = useSession();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices-my'],
    queryFn: async () => {
      if (!sdk) throw new Error('SDK not initialized');
      return sdk.invoices.my();
    },
    enabled: !!sdk
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between border-b pb-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your payment transactions will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No payment history yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <CardDescription>View all your payment transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const featureLine = invoice.lines.find((line) => line.metaJson?.featureType);
            const featureType = featureLine?.metaJson?.featureType;
            const featureId = featureLine?.metaJson?.featureId;
            const paymentStatus =
              invoice.paymentTransactions?.[0]?.status || (invoice.status === 'PAID' ? 'PAID' : 'PENDING');

            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {featureType ? getFeatureName(featureType) : invoice.lines[0]?.description || 'Payment'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {invoice.invoiceNo || invoice.id} • {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                      {featureId && (
                        <p className="text-xs text-gray-400">Target ID: {featureId.substring(0, 8)}...</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(invoice.amountCents / 100, invoice.currency)}
                    </p>
                  </div>
                  {getStatusBadge(paymentStatus)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

