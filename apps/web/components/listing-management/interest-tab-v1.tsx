"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DOMPurify from "dompurify";
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
import {
  resolveDealTypeFromApplicationType,
  resolveDealTypeFromValue,
} from "@/lib/deal-type";
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
  contractHash?: string | null;
  contractVersionStatus?: "DRAFT" | "SENT" | "SIGNED" | "VOID" | null;
  contractMethod?: "ESIGN" | "UPLOAD" | null;
  sealedAt?: string | null;
  sealedMethod?: "ESIGN" | "UPLOAD" | null;
  contractFiles?: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    url: string;
    createdAt: string;
    uploadedByUserId: string;
  }>;
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

const STAGE_BADGE_CLASS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-800",
  TERMS_SET: "bg-amber-100 text-amber-800",
  CONTRACT_READY: "bg-sky-100 text-sky-800",
  SENT: "bg-indigo-100 text-indigo-800",
  SIGNING: "bg-violet-100 text-violet-800",
  SIGNED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-zinc-100 text-zinc-700",
};

function formatStageLabel(stage: string): string {
  return stage.replaceAll("_", " ").toLowerCase();
}

function stageNextAction(stage: string): string {
  if (stage === "DRAFT") return "Set terms";
  if (stage === "TERMS_SET") return "Generate contract";
  if (stage === "CONTRACT_READY") return "Send to sign";
  if (stage === "SENT" || stage === "SIGNING") return "Collect signatures";
  if (stage === "SIGNED") return "Activate";
  return "-";
}

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
                  applicationType={item.type}
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
  applicationType,
  isManager,
}: {
  applicationId: string;
  applicantName: string;
  applicationType: string;
  isManager: boolean;
}) {
  const queryClient = useQueryClient();
  const fallbackDealType = resolveDealTypeFromApplicationType(applicationType);
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
  const [specialTerms, setSpecialTerms] = useState("");
  const [editContractHtml, setEditContractHtml] = useState(false);
  const [contractHtmlDraft, setContractHtmlDraft] = useState("");
  const [contractMethod, setContractMethod] = useState<"ESIGN" | "UPLOAD">(
    "ESIGN",
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);

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
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!deal?.id) return null;
      const response = await fetch(
        `/api/listing-management/deals/${deal.id}/terms`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to update deal terms");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "deal", applicationId],
      });
      queryClient.invalidateQueries({ queryKey: ["deals", "queue"] });
      notify.success("Deal updated");
    },
    onError: (error: any) =>
      notify.error(error?.message || "Failed to update deal"),
  });

  const generateContract = useMutation({
    mutationFn: async () => {
      if (!deal?.id) {
        throw new Error("Deal is not ready");
      }
      const response = await fetch(`/api/deals/${deal.id}/contract/generate`, {
        method: "POST",
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to auto-generate contract");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "deal", applicationId],
      });
      queryClient.invalidateQueries({ queryKey: ["deals", "queue"] });
      notify.success("Contract generated from template");
    },
    onError: (error: any) =>
      notify.error(error?.message || "Failed to generate contract"),
  });

  const sendContract = useMutation({
    mutationFn: async () => {
      if (!deal?.id) {
        throw new Error("Deal is not ready");
      }
      const response = await fetch(`/api/deals/${deal.id}/contract/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to send contract");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "deal", applicationId],
      });
      queryClient.invalidateQueries({ queryKey: ["deals", "queue"] });
      notify.success("Contract sent for signature");
    },
    onError: (error: any) =>
      notify.error(error?.message || "Failed to send contract"),
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!deal?.id) throw new Error("Deal is not ready");
      const response = await fetch(`/api/deals/${deal.id}/activate`, {
        method: "POST",
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to activate deal");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "deal", applicationId],
      });
      queryClient.invalidateQueries({ queryKey: ["deals", "queue"] });
      notify.success("Deal activated");
    },
    onError: (error: any) =>
      notify.error(error?.message || "Failed to activate deal"),
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
      queryClient.invalidateQueries({ queryKey: ["deals", "queue"] });
      notify.success("Signature saved");
    },
    onError: (error: any) => notify.error(error?.message || "Failed to sign"),
  });

  const uploadContractFile = useMutation({
    mutationFn: async () => {
      if (!deal?.id || !uploadFile) {
        throw new Error("Please select a file to upload");
      }
      const formData = new FormData();
      formData.append("file", uploadFile);
      const response = await fetch(`/api/deals/${deal.id}/contract/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to upload signed contract");
      }
      return response.json();
    },
    onSuccess: () => {
      setUploadFile(null);
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "deal", applicationId],
      });
      notify.success("Signed contract uploaded");
    },
    onError: (error: any) =>
      notify.error(error?.message || "Failed to upload signed contract"),
  });

  const sealContractMutation = useMutation({
    mutationFn: async (method: "ESIGN" | "UPLOAD") => {
      if (!deal?.id) {
        throw new Error("Deal is not ready");
      }
      const response = await fetch(`/api/deals/${deal.id}/contract/seal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to seal contract");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "deal", applicationId],
      });
      queryClient.invalidateQueries({ queryKey: ["deals", "queue"] });
      notify.success("Contract sealed");
    },
    onError: (error: any) =>
      notify.error(error?.message || "Failed to seal contract"),
  });

  const workflow = deal?.workflow ?? {};
  const lockedDealType =
    resolveDealTypeFromValue(workflow.dealType) ?? fallbackDealType;
  const stage = String(workflow.stage ?? "DRAFT").toUpperCase();
  const contractVersionStatus = workflow.contractVersionStatus ?? null;
  const nextAction = stageNextAction(stage);
  const editableStages = ["DRAFT", "TERMS_SET", "CONTRACT_READY"];
  const canEditTerms = isManager && editableStages.includes(stage);
  const canGenerateContract = isManager && editableStages.includes(stage);
  const canSendContract =
    isManager &&
    editableStages.includes(stage) &&
    contractVersionStatus === "DRAFT";
  const managerAlreadySigned = Boolean(workflow.signatures?.manager?.signedAt);
  const applicantAlreadySigned = Boolean(
    workflow.signatures?.applicant?.signedAt,
  );
  const signableStages = ["SENT", "SIGNING", "SIGNED", "ACTIVE"];
  const canManagerSign =
    isManager && signableStages.includes(stage) && !managerAlreadySigned;
  const canActivate = isManager && stage === "SIGNED";
  const isSealed = Boolean(workflow.sealedAt);
  const uploadedFiles = workflow.contractFiles ?? [];
  const canSealUpload =
    isManager &&
    uploadedFiles.length > 0 &&
    applicantAlreadySigned &&
    managerAlreadySigned &&
    !isSealed &&
    !sealContractMutation.isPending;
  const canSealEsign =
    isManager &&
    applicantAlreadySigned &&
    managerAlreadySigned &&
    !isSealed &&
    !sealContractMutation.isPending;
  const renderedContractHtml = useMemo(
    () =>
      workflow.contractHtml
        ? DOMPurify.sanitize(String(workflow.contractHtml), {
            USE_PROFILES: { html: true },
          })
        : "",
    [workflow.contractHtml],
  );

  useEffect(() => {
    if (!deal) return;
    const wfTerms = (workflow.terms ?? {}) as Record<string, unknown>;
    setTerms((prev) => ({
      ...prev,
      monthlyRent: String(
        wfTerms.monthlyRent ??
          (deal as any).rentAmount ??
          prev.monthlyRent ??
          "",
      ),
      deposit: String(wfTerms.deposit ?? prev.deposit ?? ""),
      leaseStart: wfTerms.leaseStart
        ? String(wfTerms.leaseStart).slice(0, 10)
        : prev.leaseStart,
      leaseEnd: wfTerms.leaseEnd
        ? String(wfTerms.leaseEnd).slice(0, 10)
        : prev.leaseEnd,
      salePrice: String(wfTerms.salePrice ?? prev.salePrice ?? ""),
      transferDate: wfTerms.transferDate
        ? String(wfTerms.transferDate).slice(0, 10)
        : prev.transferDate,
      conditions: String(wfTerms.conditions ?? prev.conditions ?? ""),
      rules: String(wfTerms.rules ?? prev.rules ?? ""),
    }));
    setSpecialTerms(String(wfTerms.specialTerms ?? ""));
    setContractHtmlDraft(String(workflow.contractHtml ?? ""));
    setContractMethod(
      workflow.contractMethod === "UPLOAD" ? "UPLOAD" : "ESIGN",
    );
  }, [deal, workflow.terms, workflow.contractHtml, workflow.contractMethod]);

  if (!deal) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Deal will appear here once approved.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Deal cockpit for {applicantName}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{lockedDealType}</Badge>
          <Badge
            className={
              STAGE_BADGE_CLASS[stage] ?? "bg-slate-100 text-slate-700"
            }
          >
            {formatStageLabel(stage)}
          </Badge>
          <Badge variant="outline">Next: {nextAction}</Badge>
          {contractVersionStatus ? (
            <Badge variant="outline">Contract: {contractVersionStatus}</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-6">
        <p className={stage !== "DRAFT" ? "text-foreground" : undefined}>
          1. Verify
        </p>
        <p className={stage !== "DRAFT" ? "text-foreground" : undefined}>
          2. Agree terms
        </p>
        <p
          className={
            ["CONTRACT_READY", "SENT", "SIGNING", "SIGNED", "ACTIVE"].includes(
              stage,
            )
              ? "text-foreground"
              : undefined
          }
        >
          3. Generate/Upload
        </p>
        <p
          className={
            ["SENT", "SIGNING", "SIGNED", "ACTIVE"].includes(stage)
              ? "text-foreground"
              : undefined
          }
        >
          4. Send
        </p>
        <p
          className={
            ["SIGNING", "SIGNED", "ACTIVE"].includes(stage)
              ? "text-foreground"
              : undefined
          }
        >
          5. Sign
        </p>
        <p className={isSealed ? "text-emerald-700" : undefined}>
          6. Seal/Activate
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Terms (type locked by listing)</Label>
          <p className="text-xs text-muted-foreground">
            Deal type is locked by listing intent, but price/deposit/dates
            remain editable.
          </p>
          {lockedDealType === "RENT" ? (
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
              <Textarea
                placeholder="Special terms"
                value={specialTerms}
                onChange={(event) => setSpecialTerms(event.target.value)}
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
              <Textarea
                placeholder="Special terms"
                value={specialTerms}
                onChange={(event) => setSpecialTerms(event.target.value)}
              />
            </div>
          )}
          <Button
            onClick={() =>
              updateWorkflow.mutate({
                ...terms,
                specialTerms,
                contractMethod,
              })
            }
            disabled={!canEditTerms || updateWorkflow.isPending}
          >
            Save terms
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Contract preview (auto-generated)</Label>
          {isSealed ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Sealed via{" "}
              {workflow.sealedMethod || workflow.contractMethod || "ESIGN"} at{" "}
              {workflow.sealedAt
                ? new Date(workflow.sealedAt).toLocaleString()
                : "-"}
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <select
              value={contractMethod}
              onChange={(event) =>
                setContractMethod(
                  event.target.value === "UPLOAD" ? "UPLOAD" : "ESIGN",
                )
              }
              className="h-9 rounded-md border bg-white px-2 text-xs"
              disabled={!canEditTerms}
            >
              <option value="ESIGN">eSign with PropAd</option>
              <option value="UPLOAD">Upload signed contract</option>
            </select>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setEditContractHtml((value) => !value)}
              disabled={!canEditTerms}
            >
              {editContractHtml ? "Preview" : "Edit HTML"}
            </Button>
          </div>

          {editContractHtml ? (
            <Textarea
              value={contractHtmlDraft}
              onChange={(event) => setContractHtmlDraft(event.target.value)}
              placeholder="Edit contract HTML"
              className="min-h-[220px] font-mono text-xs"
            />
          ) : renderedContractHtml ? (
            <div
              className="prose prose-sm max-h-[320px] max-w-none overflow-auto rounded-md border bg-white p-3"
              dangerouslySetInnerHTML={{ __html: renderedContractHtml }}
            />
          ) : (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Click Auto-generate contract to create the agreement.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => generateContract.mutate()}
              disabled={
                !canGenerateContract ||
                generateContract.isPending ||
                sendContract.isPending
              }
            >
              Auto-generate contract
            </Button>
            {contractMethod === "ESIGN" ? (
              <Button
                variant="ghost"
                onClick={() => sendContract.mutate()}
                disabled={
                  !canSendContract || sendContract.isPending || isSealed
                }
              >
                Send contract
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() =>
                updateWorkflow.mutate({
                  contractHtml: contractHtmlDraft,
                  contractMethod,
                })
              }
              disabled={!canEditTerms || updateWorkflow.isPending}
            >
              Save contract HTML
            </Button>
            <Button
              variant="outline"
              onClick={() => activateMutation.mutate()}
              disabled={!canActivate || activateMutation.isPending}
            >
              Activate
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/dashboard/deals/${deal.id}/contract`}>
                Open contract page
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border bg-white/70 p-3 text-xs text-muted-foreground">
            Applicant signed:{" "}
            {workflow.signatures?.applicant?.signedAt ? "Yes" : "No"}
            <br />
            Manager signed:{" "}
            {workflow.signatures?.manager?.signedAt ? "Yes" : "No"}
          </div>
          {contractMethod === "ESIGN" ? (
            <div className="flex gap-2">
              <Input
                placeholder="Your legal name"
                value={managerSignName}
                onChange={(event) => setManagerSignName(event.target.value)}
              />
              <Button
                onClick={() => signMutation.mutate()}
                disabled={
                  !canManagerSign ||
                  !managerSignName.trim() ||
                  signMutation.isPending ||
                  isSealed
                }
              >
                Sign
              </Button>
              {isManager ? (
                <Button
                  variant="outline"
                  onClick={() => sealContractMutation.mutate("ESIGN")}
                  disabled={!canSealEsign}
                >
                  Seal via eSign
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Confirm your legal name"
                  value={managerSignName}
                  onChange={(event) => setManagerSignName(event.target.value)}
                />
                <Button
                  onClick={() => signMutation.mutate()}
                  disabled={
                    !canManagerSign ||
                    !managerSignName.trim() ||
                    signMutation.isPending
                  }
                >
                  Confirm signature
                </Button>
              </div>
              <Input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(event) =>
                  setUploadFile(event.target.files?.[0] ?? null)
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => uploadContractFile.mutate()}
                  disabled={
                    !uploadFile || uploadContractFile.isPending || isSealed
                  }
                >
                  Upload signed contract
                </Button>
                {isManager ? (
                  <Button
                    onClick={() => sealContractMutation.mutate("UPLOAD")}
                    disabled={!canSealUpload}
                  >
                    Seal via Upload
                  </Button>
                ) : null}
              </div>
              {uploadedFiles.length ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {uploadedFiles.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block hover:underline"
                    >
                      {file.filename} •{" "}
                      {new Date(file.createdAt).toLocaleString()}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
