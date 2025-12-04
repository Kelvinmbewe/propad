'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  notify
} from '@propad/ui';
import type { AgentSummary, PropertyManagement as PropertyManagementType } from '@propad/sdk';
import { useAuthenticatedSDK } from '@/hooks/use-authenticated-sdk';
import { formatCurrency } from '@/lib/formatters';
import { PropertyMessenger } from './property-messenger';

export function PropertyManagement() {
  const sdk = useAuthenticatedSDK();
  const queryClient = useQueryClient();
  const [serviceFees, setServiceFees] = useState<Record<string, string>>({});
  const [selectedAgents, setSelectedAgents] = useState<Record<string, string>>({});

  const {
    data: properties,
    isLoading: loadingProperties,
    isError: propertiesError
  } = useQuery({
    queryKey: ['properties:owned'],
    queryFn: () => sdk!.properties.listOwned(),
    enabled: !!sdk
  });

  const {
    data: agents,
    isLoading: loadingAgents,
    isError: agentsError
  } = useQuery({
    queryKey: ['agents:verified'],
    queryFn: () => sdk!.agents.listVerified(),
    enabled: !!sdk
  });

  const assignMutation = useMutation({
    mutationFn: ({
      propertyId,
      agentId,
      serviceFeeUsd
    }: {
      propertyId: string;
      agentId: string;
      serviceFeeUsd?: number;
    }) => sdk!.properties.assignAgent(propertyId, { agentId, serviceFeeUsd }),
    onSuccess: (_, variables) => {
      notify.success('Verified agent assignment saved');
      setServiceFees((prev) => ({ ...prev, [variables.propertyId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['properties:owned'] });
      queryClient.invalidateQueries({ queryKey: ['property', variables.propertyId, 'messages'] });
    },
    onError: (error: unknown) => {
      const fallback = 'Unable to assign agent right now';
      if (error instanceof Error) {
        notify.error(error.message || fallback);
      } else {
        notify.error(fallback);
      }
    }
  });

  const confirmMutation = useMutation({
    mutationFn: ({ propertyId, confirmed }: { propertyId: string; confirmed: boolean }) =>
      sdk!.properties.updateDealConfirmation(propertyId, { confirmed }),
    onSuccess: (_, variables) => {
      notify.success(variables.confirmed ? 'Deal confirmed' : 'Deal confirmation cleared');
      queryClient.invalidateQueries({ queryKey: ['properties:owned'] });
    },
    onError: (error: unknown) => {
      const fallback = 'Unable to update confirmation';
      if (error instanceof Error) {
        notify.error(error.message || fallback);
      } else {
        notify.error(fallback);
      }
    }
  });

  const handleAssign = (property: PropertyManagementType) => {
    const currentSelection = selectedAgents[property.id] ?? property.agentOwner?.id ?? '';

    if (!currentSelection) {
      notify.error('Select a verified agent before assigning');
      return;
    }

    const feeInput = serviceFees[property.id]?.trim();
    let parsedFee: number | undefined;
    if (feeInput) {
      const numeric = Number(feeInput);
      if (Number.isNaN(numeric) || numeric < 0) {
        notify.error('Enter a valid service fee (optional)');
        return;
      }
      parsedFee = numeric;
    }

    assignMutation.mutate({ propertyId: property.id, agentId: currentSelection, serviceFeeUsd: parsedFee });
  };

  const handleToggleConfirmation = (property: PropertyManagementType) => {
    const confirmed = !property.dealConfirmedAt;
    confirmMutation.mutate({ propertyId: property.id, confirmed });
  };

  const verifiedAgents = useMemo(() => agents ?? [], [agents]);

  if (!sdk) {
    return <p className="text-sm text-neutral-500">Sign in to manage your listings.</p>;
  }

  if (loadingProperties) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-48" />
        ))}
      </div>
    );
  }

  if (propertiesError) {
    return <p className="text-sm text-red-600">We could not load your listings at this time.</p>;
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <p className="text-sm text-neutral-600">You have not published any listings yet.</p>
        <Button onClick={() => window.location.href = '/dashboard/listings/new'}>
          List New Property
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => window.location.href = '/dashboard/listings/new'}>
          List New Property
        </Button>
      </div>
      {properties.map((property) => {
        const priceLabel = formatCurrency(property.price, property.currency);
        const currentAssignment = property.assignments?.[0];
        const currentAgent = property.agentOwner?.name ?? 'Unassigned';
        const serviceFeeLabel =
          currentAssignment?.serviceFeeUsdCents !== null && currentAssignment?.serviceFeeUsdCents !== undefined
            ? `$${(currentAssignment.serviceFeeUsdCents / 100).toFixed(2)} landlord paid`
            : 'No service fee recorded';
        const dealConfirmedAt = property.dealConfirmedAt
          ? new Date(property.dealConfirmedAt).toLocaleString('en-ZW', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })
          : null;

        const cityLabel =
          property.cityName ?? property.location.city?.name ?? property.provinceName ?? property.location.province?.name ?? null;
        const suburbLabel = property.suburbName ?? property.location.suburb?.name ?? null;

        return (
          <Card key={property.id} className="border-neutral-200">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-semibold capitalize">{property.type.toLowerCase()}</span>
                <span className="text-base font-medium text-emerald-600">{priceLabel}</span>
              </CardTitle>
              <CardDescription>
                {cityLabel ?? property.countryName ?? property.location.country?.name ?? 'Zimbabwe'}
                {suburbLabel ? ` • ${suburbLabel}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`agent-${property.id}`}>Verified agent</Label>
                  <select
                    id={`agent-${property.id}`}
                    className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm"
                    value={selectedAgents[property.id] ?? property.agentOwner?.id ?? ''}
                    onChange={(event) =>
                      setSelectedAgents((prev) => ({ ...prev, [property.id]: event.target.value }))
                    }
                    disabled={assignMutation.isPending || loadingAgents}
                  >
                    <option value="">Select a verified agent</option>
                    {verifiedAgents.map((agent: AgentSummary) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name ?? agent.id} • {agent.agentProfile?.verifiedListingsCount ?? 0} verified
                      </option>
                    ))}
                  </select>
                  {agentsError ? (
                    <p className="text-xs text-red-600">Unable to load verified agents.</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`fee-${property.id}`}>Landlord-paid service fee (optional)</Label>
                  <Input
                    id={`fee-${property.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={serviceFees[property.id] ?? ''}
                    onChange={(event) =>
                      setServiceFees((prev) => ({ ...prev, [property.id]: event.target.value }))
                    }
                    placeholder="e.g. 25"
                    disabled={assignMutation.isPending}
                  />
                  <p className="text-xs text-neutral-500">Only the landlord pays this fee. Tenants are never charged.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
                <span>Currently assigned to: {currentAgent}</span>
                <span>{serviceFeeLabel}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
                <span>Deal status: {dealConfirmedAt ? `Confirmed ${dealConfirmedAt}` : 'Awaiting confirmation'}</span>
                <Button
                  variant={dealConfirmedAt ? 'outline' : 'default'}
                  onClick={() => handleToggleConfirmation(property)}
                  disabled={confirmMutation.isPending}
                >
                  {confirmMutation.isPending
                    ? 'Saving…'
                    : dealConfirmedAt
                      ? 'Clear confirmation'
                      : 'Mark deal confirmed'}
                </Button>
              </div>

              <PropertyMessenger
                propertyId={property.id}
                landlordId={property.landlordId}
                agentOwnerId={property.agentOwnerId}
              />
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-2">
              <Button
                onClick={() => handleAssign(property)}
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending ? 'Assigning…' : 'Assign verified agent'}
              </Button>
              <p className="text-xs text-neutral-500">Keep conversations here to reduce WhatsApp leakage.</p>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
