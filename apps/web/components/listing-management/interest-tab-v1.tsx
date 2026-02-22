"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
  Textarea,
  notify,
} from "@propad/ui";
import { Check, Info, X } from "lucide-react";
import { getImageUrl } from "@/lib/image-url";
import { acceptInterest, rejectInterest } from "@/app/actions/landlord";

type ApplicationRow = {
  id: string;
  source: "APPLICATION" | "INTEREST";
  status: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  decisionReason?: string | null;
  offerAmount?: number | string | null;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    profilePhoto?: string | null;
    trustScore?: number | null;
    verificationScore?: number | null;
    isVerified?: boolean | null;
  };
  timeline?: {
    appliedAt?: string | null;
    lastMessage?: string | null;
    nextViewingAt?: string | null;
  };
};

type DealWorkflow = {
  stage?: string;
  dealType?: "RENT" | "SALE" | null;
  terms?: Record<string, unknown>;
  contractHtml?: string | null;
  signatures?: {
    applicant?: { fullName?: string; signedAt?: string };
    manager?: { fullName?: string; signedAt?: string };
  };
};

type Deal = {
  id: string;
  status: string;
  workflow?: DealWorkflow;
};

const cannedReasons = [
  "Insufficient supporting details",
  "Budget does not match listing terms",
  "Incomplete applicant profile",
  "Schedule conflict for requested dates",
];

export function ListingInterestTabV1({ propertyId }: { propertyId: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [actionState, setActionState] = useState<{
    id: string;
    source: "APPLICATION" | "INTEREST";
    mode: "approve" | "reject" | "needs_info";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [nextStep, setNextStep] = useState<
    "SCHEDULE_VIEWING" | "PROCEED_TO_DEAL"
  >("SCHEDULE_VIEWING");

  const { data, isLoading } = useQuery<{ items: ApplicationRow[] }>({
    queryKey: ["listing-management", "applications", propertyId],
    queryFn: async () => {
      const response = await fetch(
        `/api/listing-management/applications?propertyId=${encodeURIComponent(propertyId)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load listing applications");
      }
      return response.json();
    },
    refetchInterval: 12000,
    initialData: { items: [] },
  });

  const items = useMemo(
    () =>
      (data?.items ?? [])
        .slice()
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        ),
    [data?.items],
  );

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      source: "APPLICATION" | "INTEREST";
      mode: "approve" | "reject" | "needs_info";
      reason?: string;
      nextStep?: "SCHEDULE_VIEWING" | "PROCEED_TO_DEAL";
    }) => {
      if (payload.source === "APPLICATION") {
        const status =
          payload.mode === "approve"
            ? "APPROVED"
            : payload.mode === "reject"
              ? "REJECTED"
              : "UNDER_REVIEW";

        const response = await fetch(
          `/api/listing-management/applications/${payload.id}/status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status,
              reason: payload.reason,
              nextStep: payload.nextStep,
            }),
          },
        );
        if (!response.ok) {
          const body = await response.text();
          throw new Error(body || "Failed to update application");
        }

        if (payload.mode === "approve") {
          await fetch(
            `/api/listing-management/deals/application/${payload.id}`,
            {
              method: "POST",
            },
          );
        }
        return;
      }

      const status =
        payload.mode === "approve"
          ? "ACCEPTED"
          : payload.mode === "reject"
            ? "REJECTED"
            : "ON_HOLD";
      if (status === "ACCEPTED") {
        const result = await acceptInterest(payload.id);
        if ((result as any)?.error) {
          throw new Error((result as any).error);
        }
        return;
      }
      if (status === "REJECTED") {
        const result = await rejectInterest(payload.id);
        if ((result as any)?.error) {
          throw new Error((result as any).error);
        }
        return;
      }
      throw new Error("Request more info is available on applications only");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "applications", propertyId],
      });
      notify.success("Application updated");
      setActionState(null);
      setReason("");
      setNextStep("SCHEDULE_VIEWING");
    },
    onError: (error: any) => {
      notify.error(error?.message || "Unable to update application");
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No interests or applications yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const canAct =
          item.status === "PENDING" ||
          item.status === "SUBMITTED" ||
          item.status === "NEEDS_INFO";
        const displayName =
          item.user.name || item.user.email || "Unknown applicant";
        const statusLabel =
          item.status === "UNDER_REVIEW" || item.status === "NEEDS_INFO"
            ? "Needs Info"
            : item.status;
        const typeLabel =
          item.type === "BUY_APPLICATION"
            ? "BUY_APPLICATION"
            : item.type === "RENT_APPLICATION"
              ? "RENT_APPLICATION"
              : "INTEREST";

        return (
          <Card key={`${item.source}-${item.id}`}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 border">
                    <AvatarImage src={getImageUrl(item.user.profilePhoto)} />
                    <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {displayName}
                      </p>
                      <Badge variant="secondary">{statusLabel}</Badge>
                      <Badge variant="outline">{typeLabel}</Badge>
                      <Badge variant="outline">{item.source}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Trust {item.user.trustScore ?? 0} · Verification{" "}
                      {item.user.verificationScore ?? 0}
                    </p>
                  </div>
                </div>

                {canAct ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        setActionState({
                          id: item.id,
                          source: item.source,
                          mode: "approve",
                        })
                      }
                    >
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setActionState({
                          id: item.id,
                          source: item.source,
                          mode: "needs_info",
                        })
                      }
                    >
                      <Info className="mr-1 h-4 w-4" /> Request more info
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() =>
                        setActionState({
                          id: item.id,
                          source: item.source,
                          mode: "reject",
                        })
                      }
                    >
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                <p>
                  Applied:{" "}
                  {new Date(
                    item.timeline?.appliedAt ?? item.createdAt,
                  ).toLocaleString()}
                </p>
                <p>
                  Last message: {item.timeline?.lastMessage || "No message yet"}
                </p>
                <p>
                  Next viewing:{" "}
                  {item.timeline?.nextViewingAt
                    ? new Date(item.timeline.nextViewingAt).toLocaleString()
                    : "Not scheduled"}
                </p>
              </div>

              {item.source === "APPLICATION" &&
              (item.status === "APPROVED" || item.status === "ACCEPTED") ? (
                <DealChecklistCard
                  applicationId={item.id}
                  applicantName={displayName}
                  isManager={Boolean(session?.user?.id)}
                />
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      <Dialog
        open={Boolean(actionState)}
        onOpenChange={() => setActionState(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionState?.mode === "approve"
                ? "Approve application"
                : actionState?.mode === "reject"
                  ? "Reject application"
                  : "Request more info"}
            </DialogTitle>
          </DialogHeader>

          {actionState?.mode === "approve" ? (
            <div className="space-y-3">
              <Label>Next step</Label>
              <div className="grid gap-2">
                <Button
                  variant={
                    nextStep === "SCHEDULE_VIEWING" ? "default" : "outline"
                  }
                  onClick={() => setNextStep("SCHEDULE_VIEWING")}
                >
                  Schedule viewing
                </Button>
                <Button
                  variant={
                    nextStep === "PROCEED_TO_DEAL" ? "default" : "outline"
                  }
                  onClick={() => setNextStep("PROCEED_TO_DEAL")}
                >
                  Proceed to Deal (skip viewing)
                </Button>
              </div>
            </div>
          ) : null}

          {(actionState?.mode === "reject" ||
            actionState?.mode === "needs_info") && (
            <div className="space-y-2">
              <Label>Reason</Label>
              <div className="flex flex-wrap gap-2">
                {cannedReasons.map((item) => (
                  <Button
                    key={item}
                    variant="outline"
                    size="sm"
                    onClick={() => setReason(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain your decision"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionState(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                updateMutation.isPending ||
                ((actionState?.mode === "reject" ||
                  actionState?.mode === "needs_info") &&
                  !reason.trim())
              }
              onClick={() => {
                if (!actionState) return;
                updateMutation.mutate({
                  id: actionState.id,
                  source: actionState.source,
                  mode: actionState.mode,
                  reason,
                  nextStep,
                });
              }}
            >
              {updateMutation.isPending ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DealChecklistCard({
  applicationId,
  applicantName,
  isManager,
}: {
  applicationId: string;
  applicantName: string;
  isManager: boolean;
}) {
  const queryClient = useQueryClient();
  const [dealType, setDealType] = useState<"RENT" | "SALE">("RENT");
  const [terms, setTerms] = useState<Record<string, string>>({
    monthlyRent: "",
    deposit: "",
    leaseStart: "",
    leaseEnd: "",
    salePrice: "",
    transferDate: "",
    conditions: "",
    rules: "",
  });
  const [managerSignName, setManagerSignName] = useState("");
  const [contractHtmlDraft, setContractHtmlDraft] = useState("");

  const dealQuery = useQuery<Deal | null>({
    queryKey: ["listing-management", "deal", applicationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/listing-management/deals/application/${applicationId}`,
      );
      if (!response.ok) return null;
      return response.json();
    },
  });

  const deal = dealQuery.data;

  const updateWorkflow = useMutation({
    mutationFn: async (payload: Partial<DealWorkflow>) => {
      if (!deal?.id) return null;
      const response = await fetch(
        `/api/listing-management/deals/${deal.id}/workflow`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to update deal workflow");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "deal", applicationId],
      });
      notify.success("Deal updated");
    },
    onError: (error: any) =>
      notify.error(error?.message || "Failed to update deal"),
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!deal?.id) return;
      const response = await fetch(
        `/api/listing-management/deals/${deal.id}/sign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: managerSignName, agreed: true }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to sign deal");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "deal", applicationId],
      });
      notify.success("Signature saved");
    },
    onError: (error: any) => notify.error(error?.message || "Failed to sign"),
  });

  if (!deal) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Deal will appear here once approved.
      </div>
    );
  }

  const workflow = deal.workflow ?? {};
  const stage = workflow.stage ?? "DRAFT";

  useEffect(() => {
    setContractHtmlDraft((workflow.contractHtml as string) ?? "");
  }, [workflow.contractHtml]);

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Deal cockpit for {applicantName}
        </p>
        <Badge variant="outline">{stage}</Badge>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-5">
        <p>1. Verify parties</p>
        <p>2. Agree terms</p>
        <p>3. Generate contract</p>
        <p>4. Sign</p>
        <p>5. Activate</p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Deal type</Label>
          <div className="flex gap-2">
            <Button
              variant={dealType === "RENT" ? "default" : "outline"}
              onClick={() => setDealType("RENT")}
            >
              RENT
            </Button>
            <Button
              variant={dealType === "SALE" ? "default" : "outline"}
              onClick={() => setDealType("SALE")}
            >
              SALE
            </Button>
          </div>
          {dealType === "RENT" ? (
            <div className="grid gap-2">
              <Input
                placeholder="Monthly rent"
                value={terms.monthlyRent}
                onChange={(e) =>
                  setTerms((s) => ({ ...s, monthlyRent: e.target.value }))
                }
              />
              <Input
                placeholder="Deposit"
                value={terms.deposit}
                onChange={(e) =>
                  setTerms((s) => ({ ...s, deposit: e.target.value }))
                }
              />
              <Input
                type="date"
                value={terms.leaseStart}
                onChange={(e) =>
                  setTerms((s) => ({ ...s, leaseStart: e.target.value }))
                }
              />
              <Input
                type="date"
                value={terms.leaseEnd}
                onChange={(e) =>
                  setTerms((s) => ({ ...s, leaseEnd: e.target.value }))
                }
              />
              <Textarea
                placeholder="Rules"
                value={terms.rules}
                onChange={(e) =>
                  setTerms((s) => ({ ...s, rules: e.target.value }))
                }
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Input
                placeholder="Sale price"
                value={terms.salePrice}
                onChange={(e) =>
                  setTerms((s) => ({ ...s, salePrice: e.target.value }))
                }
              />
              <Input
                type="date"
                value={terms.transferDate}
                onChange={(e) =>
                  setTerms((s) => ({ ...s, transferDate: e.target.value }))
                }
              />
              <Textarea
                placeholder="Conditions / inclusions"
                value={terms.conditions}
                onChange={(e) =>
                  setTerms((s) => ({ ...s, conditions: e.target.value }))
                }
              />
            </div>
          )}
          <Button
            onClick={() =>
              updateWorkflow.mutate({
                stage: "DRAFT",
                dealType,
                terms,
              })
            }
            disabled={!isManager || updateWorkflow.isPending}
          >
            Save terms
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Contract preview</Label>
          <Textarea
            value={contractHtmlDraft || workflow.contractHtml || ""}
            onChange={(event) => setContractHtmlDraft(event.target.value)}
            placeholder="Paste or edit contract HTML preview"
            className="min-h-[140px]"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                updateWorkflow.mutate({
                  stage: "CONTRACT_SENT",
                  dealType,
                  terms,
                  contractHtml:
                    contractHtmlDraft || workflow.contractHtml || "",
                })
              }
              disabled={!isManager || updateWorkflow.isPending}
            >
              Send contract
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                updateWorkflow.mutate({
                  stage: "DRAFT",
                  dealType,
                  terms,
                  contractHtml:
                    contractHtmlDraft || workflow.contractHtml || "",
                })
              }
              disabled={!isManager || updateWorkflow.isPending}
            >
              Save draft
            </Button>
            <Button
              variant="outline"
              onClick={() => updateWorkflow.mutate({ stage: "ACTIVE" })}
              disabled={!isManager || updateWorkflow.isPending}
            >
              Mark active
            </Button>
          </div>
          <div className="rounded-lg border bg-white/70 p-3 text-xs text-muted-foreground">
            Applicant signed:{" "}
            {workflow.signatures?.applicant?.signedAt ? "Yes" : "No"}
            <br />
            Manager signed:{" "}
            {workflow.signatures?.manager?.signedAt ? "Yes" : "No"}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Your legal name"
              value={managerSignName}
              onChange={(event) => setManagerSignName(event.target.value)}
            />
            <Button
              onClick={() => signMutation.mutate()}
              disabled={!managerSignName.trim() || signMutation.isPending}
            >
              Sign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
