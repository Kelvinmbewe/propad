"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
} from "@propad/ui";
import { FileCheck, UploadCloud } from "lucide-react";
import { format } from "date-fns";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";

type OwnerType = "USER" | "AGENCY";

interface UploadState {
  file: File;
  progress: number;
  status: "idle" | "uploading" | "uploaded" | "error";
  url?: string;
  error?: string;
}

interface KycSubmissionPanelProps {
  ownerType: OwnerType;
  ownerId?: string;
  title?: string;
  description?: string;
}

export function KycSubmissionPanel({
  ownerType,
  ownerId,
  title = "KYC Verification",
  description = "Submit identity documents for compliance review.",
}: KycSubmissionPanelProps) {
  const { data } = useSession();
  const apiBaseUrl = getRequiredPublicApiBaseUrl();
  const token = data?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  const [idType, setIdType] = useState("NATIONAL_ID");
  const [idNumber, setIdNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const isOwner =
    ownerType === "USER" ? data?.user?.id === ownerId || !ownerId : true;

  const historyQueryKey = useMemo(() => {
    if (ownerType === "AGENCY" && ownerId) {
      return ["kyc-history", ownerType, ownerId];
    }
    return ["kyc-history", ownerType];
  }, [ownerType, ownerId]);

  const historyQuery = useQuery({
    queryKey: historyQueryKey,
    enabled: !!token && isOwner,
    queryFn: async () => {
      const endpoint =
        ownerType === "AGENCY" && ownerId
          ? `${apiBaseUrl}/wallets/kyc/agency/${ownerId}/history`
          : `${apiBaseUrl}/wallets/kyc/history`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load KYC history");
      return res.json() as Promise<Array<any>>;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const docUrls = uploads
        .filter((item) => item.status === "uploaded" && item.url)
        .map((item) => item.url!);
      if (docUrls.length === 0) {
        throw new Error("Upload at least one document.");
      }
      const endpoint =
        ownerType === "AGENCY" && ownerId
          ? `${apiBaseUrl}/wallets/kyc/agency/${ownerId}`
          : `${apiBaseUrl}/wallets/kyc`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idType,
          idNumber,
          docUrls,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit KYC");
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: historyQueryKey });
      setIdNumber("");
      setNotes("");
      setUploads([]);
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || !token) return;
    const nextUploads: UploadState[] = Array.from(files).map((file) => ({
      file,
      progress: 0,
      status: "uploading",
    }));
    setUploads((prev) => [...prev, ...nextUploads]);

    nextUploads.forEach((upload) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", upload.file);

      const endpoint =
        ownerType === "AGENCY" && ownerId
          ? `${apiBaseUrl}/wallets/kyc/agency/${ownerId}/upload`
          : `${apiBaseUrl}/wallets/kyc/upload`;

      xhr.open("POST", endpoint);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploads((current) =>
            current.map((item) =>
              item.file === upload.file ? { ...item, progress } : item,
            ),
          );
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText) as { url: string };
          setUploads((current) =>
            current.map((item) =>
              item.file === upload.file
                ? {
                    ...item,
                    progress: 100,
                    status: "uploaded",
                    url: response.url,
                  }
                : item,
            ),
          );
        } else {
          setUploads((current) =>
            current.map((item) =>
              item.file === upload.file
                ? { ...item, status: "error", error: "Upload failed" }
                : item,
            ),
          );
        }
      };
      xhr.onerror = () => {
        setUploads((current) =>
          current.map((item) =>
            item.file === upload.file
              ? { ...item, status: "error", error: "Upload failed" }
              : item,
          ),
        );
      };
      xhr.send(formData);
    });
  };

  const canSubmit =
    idNumber.trim().length > 2 &&
    uploads.some((item) => item.status === "uploaded");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-emerald-600" /> {title}
        </CardTitle>
        <p className="text-sm text-neutral-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {!isOwner && (
          <p className="text-xs text-neutral-400">
            Only the profile owner can submit verification documents.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-600">
              ID type
            </label>
            <select
              value={idType}
              onChange={(event) => setIdType(event.target.value)}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              disabled={!isOwner}
            >
              <option value="NATIONAL_ID">National ID</option>
              <option value="PASSPORT">Passport</option>
              {ownerType === "AGENCY" && (
                <option value="CERT_OF_INC">
                  Certificate of Incorporation
                </option>
              )}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-600">
              ID number
            </label>
            <Input
              value={idNumber}
              onChange={(event) => setIdNumber(event.target.value)}
              placeholder="Enter the ID number"
              disabled={!isOwner}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-600">
              Upload documents
            </label>
            <Input
              type="file"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
              disabled={!isOwner}
            />
            <p className="text-xs text-neutral-500">
              Accepted: JPG, PNG, WebP, PDF. Max 10MB.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-600">
              Reviewer notes
            </label>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Any extra context for the verification team"
              disabled={!isOwner}
            />
          </div>
        </div>

        {uploads.length > 0 && (
          <div className="space-y-3">
            {uploads.map((upload) => (
              <div
                key={upload.file.name}
                className="rounded-md border border-neutral-100 p-3"
              >
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{upload.file.name}</span>
                  <span>
                    {upload.status === "uploaded"
                      ? "Uploaded"
                      : upload.status === "error"
                        ? "Failed"
                        : `${upload.progress}%`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full ${upload.status === "error" ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="gap-2"
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending || !isOwner}
          >
            <UploadCloud className="h-4 w-4" />
            {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
          </Button>
          <Badge variant="outline" className="text-xs">
            {historyQuery.data?.[0]?.status ?? "No submissions"}
          </Badge>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-neutral-900">
            Review history
          </h4>
          {historyQuery.isLoading ? (
            <p className="text-xs text-neutral-500">Loading history...</p>
          ) : historyQuery.data && historyQuery.data.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200 text-xs">
                <thead className="bg-neutral-50 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">ID type</th>
                    <th className="px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {historyQuery.data.map((record) => (
                    <tr key={record.id} className="bg-white">
                      <td className="px-3 py-2 font-medium text-neutral-700">
                        {record.status}
                      </td>
                      <td className="px-3 py-2 text-neutral-500">
                        {record.idType}
                      </td>
                      <td className="px-3 py-2 text-neutral-500">
                        {record.updatedAt
                          ? format(new Date(record.updatedAt), "MMM d, yyyy")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">No submissions yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
