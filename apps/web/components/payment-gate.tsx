'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Badge } from '@propad/ui';
import { formatCurrency } from '@/lib/formatters';
import { CheckCircle2, Lock, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

const getFeatureDisplayName = (featureType: string): string => {
  const names: Record<string, string> = {
    PROPERTY_VERIFICATION: 'Property Verification',
    AGENT_ASSIGNMENT: 'Agent Assignment',
    FEATURED_LISTING: 'Featured Listing',
    TRUST_BOOST: 'Trust Boost',
    IN_HOUSE_ADVERT_BUYING: 'In-House Ad (Buying)',
    IN_HOUSE_ADVERT_SELLING: 'In-House Ad (Selling)',
    PREMIUM_VERIFICATION: 'Premium Verification',
    OTHER: 'Other Feature'
  };
  return names[featureType] || featureType;
};

type ChargeableItemType =
  | 'PROPERTY_VERIFICATION'
  | 'AGENT_ASSIGNMENT'
  | 'FEATURED_LISTING'
  | 'TRUST_BOOST'
  | 'IN_HOUSE_ADVERT_BUYING'
  | 'IN_HOUSE_ADVERT_SELLING'
  | 'PREMIUM_VERIFICATION'
  | 'OTHER';

interface PaymentGateProps {
  featureType: ChargeableItemType;
  targetId: string;
  featureName: string;
  featureDescription?: string;
  onGranted?: () => void;
  children?: React.ReactNode;
}

interface FeatureAccess {
  status: 'FREE' | 'REQUIRED' | 'GRANTED' | 'EXPIRED';
  pricingBreakdown?: {
    priceCents: number;
    currency: string;
    totalCents: number;
    commissionCents?: number;
    platformFeeCents?: number;
  };
  paymentTransactionId?: string;
  requiresPayment: boolean;
}

interface PricingBreakdown {
  featureType: ChargeableItemType;
  isFree: boolean;
  priceCents: number;
  totalCents: number;
  currency: string;
  commissionCents?: number;
  platformFeeCents?: number;
}

export function PaymentGate({
  featureType,
  targetId,
  featureName,
  featureDescription,
  onGranted,
  children
}: PaymentGateProps) {
  const { data: session } = useSession();
  const [processing, setProcessing] = useState(false);
  const onGrantedCalledRef = useRef(false);

  const { data: access, isLoading: loadingAccess } = useQuery<FeatureAccess>({
    queryKey: ['feature-access', featureType, targetId],
    queryFn: async () => {
      const token = session?.accessToken;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/features/access/${featureType}/${targetId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (!response.ok) {
        throw new Error('Failed to check feature access');
      }
      return response.json();
    },
    enabled: !!session?.accessToken
  });

  const { data: pricing } = useQuery<PricingBreakdown>({
    queryKey: ['feature-pricing', featureType],
    queryFn: async () => {
      const token = session?.accessToken;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/features/pricing/${featureType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (!response.ok) {
        throw new Error('Failed to load pricing');
      }
      return response.json();
    },
    enabled: !!session?.accessToken && (access?.status === 'REQUIRED' || access?.status === 'EXPIRED')
  });

  const handlePayment = async () => {
    if (!session?.accessToken || !pricing) return;

    setProcessing(true);
    try {
      // Create invoice for feature
      const invoiceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/invoices/for-feature`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`
          },
          body: JSON.stringify({
            featureType,
            featureId: targetId,
            currency: pricing.currency
          })
        }
      );

      if (!invoiceResponse.ok) {
        const error = await invoiceResponse.json();
        throw new Error(error.message || 'Failed to create invoice');
      }

      const invoice = await invoiceResponse.json();

      // Create payment intent
      const intentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/intents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`
          },
          body: JSON.stringify({
            invoiceId: invoice.id,
            gateway: 'PAYNOW',
            returnUrl: `${window.location.origin}/dashboard/payments?invoice=${invoice.id}`
          })
        }
      );

      if (!intentResponse.ok) {
        const error = await intentResponse.json();
        throw new Error(error.message || 'Failed to create payment intent');
      }

      const intent = await intentResponse.json();

      // Redirect to payment gateway
      if (intent.redirectUrl) {
        window.location.href = intent.redirectUrl;
      } else {
        throw new Error('No redirect URL received from payment gateway');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.');
      setProcessing(false);
    }
  };

  if (loadingAccess) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (!access) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to check feature access. Please refresh the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Call onGranted callback when status becomes GRANTED (only once)
  useEffect(() => {
    if (access?.status === 'GRANTED' && onGranted && !onGrantedCalledRef.current) {
      onGrantedCalledRef.current = true;
      onGranted();
    }
    // Reset when status changes away from GRANTED
    if (access?.status !== 'GRANTED') {
      onGrantedCalledRef.current = false;
    }
  }, [access?.status, onGranted]);

  // Feature is FREE or already GRANTED - show children
  if (access.status === 'FREE' || access.status === 'GRANTED') {
    if (access.status === 'GRANTED') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Access Granted</p>
              <p className="text-xs text-green-700">
                You have access to {featureName || getFeatureDisplayName(featureType)}
              </p>
            </div>
          </div>
          {children}
        </div>
      );
    }
    return <>{children}</>;
  }

  // Payment REQUIRED - show payment gate
  if (access.status === 'REQUIRED') {
    const price = access.pricingBreakdown || pricing;
    const totalAmount = price ? price.totalCents / 100 : 0;
    const currency = price?.currency || 'USD';

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            <CardTitle>Payment Required</CardTitle>
          </div>
          <CardDescription>
            {featureDescription || `Complete payment to access ${featureName || getFeatureDisplayName(featureType)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {featureName || getFeatureDisplayName(featureType)}
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(totalAmount, currency)}
              </span>
            </div>
            {price && (price.commissionCents || price.platformFeeCents) && (
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                {price.commissionCents && (
                  <div className="flex justify-between">
                    <span>Commission</span>
                    <span>{formatCurrency(price.commissionCents / 100, currency)}</span>
                  </div>
                )}
                {price.platformFeeCents && (
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span>{formatCurrency(price.platformFeeCents / 100, currency)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <p>What you get:</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-blue-700">
              {featureType === 'PROPERTY_VERIFICATION' && (
                <>
                  <li>Property verification badge</li>
                  <li>Priority in search results</li>
                  <li>Increased trust score</li>
                </>
              )}
              {featureType === 'AGENT_ASSIGNMENT' && (
                <>
                  <li>Verified agent assignment</li>
                  <li>Professional property management</li>
                  <li>Lead generation support</li>
                </>
              )}
              {featureType === 'FEATURED_LISTING' && (
                <>
                  <li>Featured placement in search</li>
                  <li>Increased visibility</li>
                  <li>More qualified leads</li>
                </>
              )}
              {featureType === 'TRUST_BOOST' && (
                <>
                  <li>Enhanced trust score</li>
                  <li>Verified badge display</li>
                  <li>Priority customer support</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handlePayment}
            disabled={processing || !pricing}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatCurrency(totalAmount, currency)}`
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // EXPIRED status - show message and allow renewal
  const handleRenewal = async () => {
    // Reuse handlePayment logic since it's the same flow
    await handlePayment();
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600" />
          <CardTitle className="text-red-900">Access Expired</CardTitle>
        </div>
        <CardDescription className="text-red-700">
          Your access to {featureName || getFeatureDisplayName(featureType)} has expired
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-white p-4">
          <p className="text-sm text-red-800">
            To regain access, please complete a new payment for this feature or contact support for assistance.
          </p>
        </div>
        <Button
          onClick={handleRenewal}
          disabled={processing || !pricing}
          variant="outline"
          className="w-full border-red-300 text-red-700 hover:bg-red-100"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : pricing ? (
            `Renew Access - ${formatCurrency((pricing.totalCents || 0) / 100, pricing.currency || 'USD')}`
          ) : (
            'Loading...'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

