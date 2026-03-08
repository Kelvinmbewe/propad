"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import DOMPurify from "dompurify";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  notify,
} from "@propad/ui";

type DealResponse = {
  id: string;
  status: string;
  tenantId: string;
  landlordId: string;
  agentId?: string | null;
  property?: { title?: string | null };
  workflow?: {
    stage?: string;
    contractHtml?: string | null;
    contractHash?: string | null;
    contractVersionStatus?: string | null;
    contractMethod?: "ESIGN" | "UPLOAD" | null;
    sealedMethod?: "ESIGN" | "UPLOAD" | null;
    sealedAt?: string | null;
    signatures?: {
      manager?: { fullName?: string; signedAt?: string | null } | null;
      applicant?: { fullName?: string; signedAt?: string | null } | null;
    };
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
  };
  contractVersions?: Array<{
    id: string;
    versionInt: number;
    status: string;
    snapshotFormat: string;
    snapshotText: string;
    snapshotHash: string;
    createdAt: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Not signed";
  }
  return new Date(value).toLocaleString();
}

export default function DealContractPage() {
  const params = useParams<{ id: string }>();
  const dealId = params?.id;
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const role = String((session?.user as any)?.role ?? "").toUpperCase();
  const [viewSource, setViewSource] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data, isLoading, isError } = useQuery<DealResponse>({
    queryKey: ["deal-contract", dealId],
    queryFn: async () => {
      const response = await fetch(`/api/deals/${dealId}/contract`);
      if (!response.ok) {
        throw new Error("Failed to load contract");
      }
      return response.json();
    },
    enabled: Boolean(dealId),
  });

  const latestVersion = data?.contractVersions?.[0] ?? null;
  const contractHtml = latestVersion?.snapshotText || data?.workflow?.contractHtml || "";
  const renderedContractHtml = useMemo(
    () =>
      contractHtml
        ? DOMPurify.sanitize(contractHtml, { USE_PROFILES: { html: true } })
        : "",
    [contractHtml],
  );

  const isManager = Boolean(
    data && userId && (data.landlordId === userId || data.agentId === userId),
  );
  const isApplicant = Boolean(data && userId && data.tenantId === userId);
  const isStaff = ["ADMIN", "VERIFIER", "MODERATOR"].includes(role);
  const canSign = isManager || isApplicant || isStaff;
  const canSeal = isManager || isStaff;
  const managerSigned = Boolean(data?.workflow?.signatures?.manager?.signedAt);
  const applicantSigned = Boolean(data?.workflow?.signatures?.applicant?.signedAt);
  const hasBothSignatures = managerSigned && applicantSigned;
  const hasUpload = Boolean(data?.workflow?.contractFiles?.length);

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!dealId) return;
      const response = await fetch(`/api/deals/${dealId}/contract/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: legalName,
          agreed: true,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to sign contract");
      }
      return response.json();
    },
    onSuccess: () => {
      notify.success("Signature recorded");
      queryClient.invalidateQueries({ queryKey: ["deal-contract", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals", "queue"] });
    },
    onError: (error: any) => {
      notify.error(error?.message || "Failed to sign contract");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!dealId || !selectedFile) return;
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch(`/api/deals/${dealId}/contract/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to upload contract file");
      }
      return response.json();
    },
    onSuccess: () => {
      notify.success("Signed contract file uploaded");
      queryClient.invalidateQueries({ queryKey: ["deal-contract", dealId] });
    },
    onError: (error: any) => {
      notify.error(error?.message || "Failed to upload contract file");
    },
  });

  const sealMutation = useMutation({
    mutationFn: async (method: "ESIGN" | "UPLOAD") => {
      if (!dealId) return;
      const response = await fetch(`/api/deals/${dealId}/contract/seal`, {
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
      notify.success("Contract sealed");
      queryClient.invalidateQueries({ queryKey: ["deal-contract", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals", "queue"] });
    },
    onError: (error: any) => {
      notify.error(error?.message || "Failed to seal contract");
    },
  });

  const signatureRoleLabel = useMemo(() => {
    if (isApplicant) return "Applicant";
    if (isManager || isStaff) return "Listing manager";
    return null;
  }, [isApplicant, isManager, isStaff]);

  if (isLoading) {
    return <Skeleton className="h-72" />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-muted-foreground">
          We could not load this deal contract.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/deals">Back to deals</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Contract preview
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            {data.property?.title || "Deal Contract"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">Deal {data.status}</Badge>
          <Badge>
            {latestVersion?.status || data.workflow?.contractVersionStatus || "NO_VERSION"}
          </Badge>
          <Badge variant="secondary">
            Method: {data.workflow?.contractMethod || "ESIGN"}
          </Badge>
          {data.workflow?.sealedAt ? (
            <Badge className="bg-emerald-100 text-emerald-700">
              Sealed via {data.workflow?.sealedMethod || data.workflow?.contractMethod}
            </Badge>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Snapshot integrity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Version:</span>{" "}
            {latestVersion ? `v${latestVersion.versionInt}` : "Not created"}
          </p>
          <p className="break-all">
            <span className="font-medium">SHA-256:</span>{" "}
            {latestVersion?.snapshotHash || data.workflow?.contractHash || "Unavailable"}
          </p>
          <p>
            <span className="font-medium">Created:</span>{" "}
            {latestVersion ? new Date(latestVersion.createdAt).toLocaleString() : "-"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signatures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="font-medium">Listing manager</p>
              <p className="text-muted-foreground">
                {data.workflow?.signatures?.manager?.fullName || "Pending"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(data.workflow?.signatures?.manager?.signedAt)}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Applicant</p>
              <p className="text-muted-foreground">
                {data.workflow?.signatures?.applicant?.fullName || "Pending"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(data.workflow?.signatures?.applicant?.signedAt)}
              </p>
            </div>
          </div>

          {canSign ? (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Sign as {signatureRoleLabel || "participant"}
              </p>
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  placeholder="Enter your legal name"
                  value={legalName}
                  onChange={(event) => setLegalName(event.target.value)}
                />
                <Button
                  onClick={() => signMutation.mutate()}
                  disabled={signMutation.isPending || legalName.trim().length < 2}
                >
                  {signMutation.isPending ? "Signing..." : "eSign contract"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              You are not a deal participant and cannot sign this contract.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewSource((value) => !value)}
            >
              {viewSource ? "Read" : "View source"}
            </Button>
          </div>

          {viewSource ? (
            <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-xs leading-relaxed">
              {contractHtml || "No contract snapshot yet."}
            </pre>
          ) : renderedContractHtml ? (
            <div className="max-h-[560px] overflow-auto rounded-md border bg-white p-4">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedContractHtml }}
              />
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No contract snapshot yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload signed contract (fallback)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            If parties signed outside PropAd, upload the signed PDF/JPG/PNG and
            seal via upload.
          </p>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] ?? null)
              }
            />
            <Button
              variant="outline"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !selectedFile}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload file"}
            </Button>
          </div>

          {data.workflow?.contractFiles?.length ? (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              {data.workflow.contractFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:underline"
                  >
                    {file.filename}
                  </a>
                  <span className="text-muted-foreground">
                    {new Date(file.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {canSeal ? (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => sealMutation.mutate("ESIGN")}
                disabled={sealMutation.isPending || !hasBothSignatures}
              >
                Seal via eSign
              </Button>
              <Button
                variant="outline"
                onClick={() => sealMutation.mutate("UPLOAD")}
                disabled={sealMutation.isPending || !hasUpload || !hasBothSignatures}
              >
                Seal via Upload
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/deals">Back to deals</Link>
      </Button>
    </div>
  );
}
