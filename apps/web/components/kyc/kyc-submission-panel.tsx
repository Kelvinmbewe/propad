"use client";

import { useEffect, useMemo, useState } from "react";
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
  idNumberLabel?: string;
  prefillIdNumber?: string;
  prefillIdType?: string;
  prefillIdExpiryDate?: string;
  ownerUpdatedAt?: string | Date;
  prerequisiteMet?: boolean;
  prerequisiteMessage?: string;
  idTypeOptions?: Array<{ value: string; label: string }>;
  documentChecklist?: Array<{ title: string; description: string }>;
  documentSlots?: Array<{
    key: string;
    label: string;
    description?: string;
    docType: string;
    required?: boolean;
    multiple?: boolean;
    maxCount?: number;
  }>;
  requestUpdateEndpoint?: string;
}

export function KycSubmissionPanel({
  ownerType,
  ownerId,
  title = "KYC Verification",
  description = "Submit identity documents for compliance review.",
  idNumberLabel,
  prefillIdNumber,
  prefillIdType,
  prefillIdExpiryDate,
  ownerUpdatedAt,
  prerequisiteMet = true,
  prerequisiteMessage,
  idTypeOptions,
  documentChecklist,
  documentSlots,
  requestUpdateEndpoint,
}: KycSubmissionPanelProps) {
  const { data } = useSession();
  const apiBaseUrl = getRequiredPublicApiBaseUrl();
  const token = data?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  const defaultIdTypes =
    ownerType === "AGENCY"
      ? [
          { value: "CERT_OF_INC", label: "Certificate of Incorporation" },
          { value: "NATIONAL_ID", label: "National ID" },
          { value: "PASSPORT", label: "Passport" },
        ]
      : [
          { value: "NATIONAL_ID", label: "National ID" },
          { value: "PASSPORT", label: "Passport" },
        ];
  const idTypes = idTypeOptions ?? defaultIdTypes;
  const [idType, setIdType] = useState(idTypes[0]?.value ?? "NATIONAL_ID");
  const [idNumber, setIdNumber] = useState("");
  const [idExpiryDate, setIdExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [docTypeSelections, setDocTypeSelections] = useState<
    Record<string, string>
  >({});
  const [slotInputCounts, setSlotInputCounts] = useState<
    Record<string, number>
  >({});

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

  const historyRecords = historyQuery.data ?? [];
  const latestRecord = historyRecords[0];
  const overallStatus = historyRecords.some(
    (record) => record.status === "VERIFIED",
  )
    ? "VERIFIED"
    : historyRecords.some((record) => record.status === "REJECTED")
      ? "REJECTED"
      : historyRecords.length > 0
        ? "PENDING"
        : "PENDING";
  const [updateRequested, setUpdateRequested] = useState(false);
  const existingDocTypes = Array.from(
    new Set(
      historyRecords.flatMap((record) =>
        Array.isArray(record.docTypes) ? record.docTypes : [],
      ),
    ),
  );
  const ownerUpdatedAtDate = ownerUpdatedAt ? new Date(ownerUpdatedAt) : null;
  const ownerHasUpdates =
    ownerUpdatedAtDate && latestRecord?.updatedAt
      ? ownerUpdatedAtDate.getTime() >
        new Date(latestRecord.updatedAt).getTime()
      : false;
  const passportExpiryDate = historyRecords
    .filter((record) => record.idType === "PASSPORT" && record.idExpiryDate)
    .map((record) => new Date(record.idExpiryDate))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const passportExpired = passportExpiryDate
    ? passportExpiryDate.getTime() < Date.now()
    : false;
  const allowSupplemental =
    overallStatus === "VERIFIED" &&
    (ownerHasUpdates ||
      passportExpired ||
      documentSlots?.some(
        (slot) =>
          !existingDocTypes.includes(
            slot.docType === "IDENTITY" ? idType : slot.docType,
          ),
      ));
  const isLocked =
    overallStatus === "VERIFIED" && !updateRequested && !allowSupplemental;

  useEffect(() => {
    if (prefillIdExpiryDate && !idExpiryDate) {
      setIdExpiryDate(prefillIdExpiryDate);
    } else if (latestRecord?.idExpiryDate && !idExpiryDate) {
      setIdExpiryDate(
        new Date(latestRecord.idExpiryDate).toISOString().slice(0, 10),
      );
    }
    if (prefillIdNumber && !idNumber) {
      setIdNumber(prefillIdNumber);
    } else if (latestRecord?.idNumber && !idNumber) {
      setIdNumber(latestRecord.idNumber);
    }
    if (prefillIdType && idType !== prefillIdType) {
      setIdType(prefillIdType);
    } else if (latestRecord?.idType && idType !== latestRecord.idType) {
      setIdType(latestRecord.idType);
    }
  }, [
    prefillIdExpiryDate,
    prefillIdNumber,
    prefillIdType,
    latestRecord?.idExpiryDate,
    latestRecord?.idNumber,
    latestRecord?.idType,
  ]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const uploadsBase = apiBaseUrl.replace(/\/v1$/, "");
      const docUrls = uploads
        .filter((item) => item.status === "uploaded" && item.url)
        .map((item) => {
          if (!item.url) return item.url;
          if (item.url.startsWith("http")) return item.url;
          return `${uploadsBase}${item.url}`;
        })
        .filter(Boolean) as string[];
      const docTypes = uploads
        .filter((item) => item.status === "uploaded" && item.url)
        .map((item) => docTypeSelections[item.url ?? ""] || "UNKNOWN");
      if (docUrls.length === 0) {
        throw new Error("Upload at least one document.");
      }
      const endpoint =
        ownerType === "AGENCY" && ownerId
          ? `${apiBaseUrl}/wallets/kyc/agency/${ownerId}`
          : `${apiBaseUrl}/wallets/kyc`;
      const submissions = docUrls.map((docUrl, index) => {
        const docType = docTypes[index] ?? "UNKNOWN";
        return fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            idType,
            idNumber: effectiveIdNumber,
            idExpiryDate: idExpiryDate || undefined,
            docUrls: [docUrl],
            docTypes: [docType],
            notes: notes || undefined,
          }),
        });
      });
      const responses = await Promise.all(submissions);
      const failed = responses.find((res) => !res.ok);
      if (failed) {
        throw new Error("Failed to submit KYC");
      }
      return responses;
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
          setDocTypeSelections((current) => ({
            ...current,
            [response.url]: current[response.url] || "UNKNOWN",
          }));
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

  const handleSlotFiles = (docType: string, files: FileList | null) => {
    if (!files || !token) return;
    const resolvedDocType = docType === "IDENTITY" ? idType : docType;
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
          setDocTypeSelections((current) => ({
            ...current,
            [response.url]: resolvedDocType,
          }));
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

  const handleAddSlotInput = (slotKey: string, maxCount = 1) => {
    setSlotInputCounts((current) => {
      const currentCount = current[slotKey] ?? 1;
      return {
        ...current,
        [slotKey]: Math.min(currentCount + 1, Math.max(1, maxCount)),
      };
    });
  };

  const requestKycUpdate = async () => {
    if (!requestUpdateEndpoint || !token) return;
    const res = await fetch(`${apiBaseUrl}${requestUpdateEndpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setUpdateRequested(true);
      await queryClient.invalidateQueries({ queryKey: historyQueryKey });
    }
  };

  const uploadedDocTypes = uploads
    .filter((item) => item.status === "uploaded" && item.url)
    .map((item) => docTypeSelections[item.url ?? ""] || "UNKNOWN");
  const isIdentityRequired = () => {
    if (!documentSlots) return false;
    const hasIdentity = existingDocTypes.includes(idType);
    if (!hasIdentity) return true;
    if (idType === "PASSPORT" && passportExpired) return true;
    return false;
  };
  const requiredSlotsMet = documentSlots
    ? documentSlots
        .filter((slot) => slot.required)
        .every((slot) => {
          const slotDocType =
            slot.docType === "IDENTITY" ? idType : slot.docType;
          const alreadySubmitted = existingDocTypes.includes(slotDocType);
          const requiredNow =
            slot.docType === "IDENTITY"
              ? isIdentityRequired()
              : !alreadySubmitted;
          if (!requiredNow) return true;
          return uploadedDocTypes.includes(slotDocType);
        })
    : true;
  const effectiveIdNumber = idNumber.trim() || latestRecord?.idNumber || "";
  const canSubmit =
    effectiveIdNumber.trim().length > 2 &&
    uploads.some((item) => item.status === "uploaded") &&
    requiredSlotsMet &&
    (idType !== "PASSPORT" || idExpiryDate.trim().length > 0);
  const isDisabled = !prerequisiteMet || !isOwner || isLocked;
  const shouldShowRequestUpdate =
    overallStatus === "VERIFIED" && requestUpdateEndpoint && !allowSupplemental;

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
        {!prerequisiteMet && prerequisiteMessage && (
          <p className="text-xs font-medium text-amber-600">
            {prerequisiteMessage}
          </p>
        )}
        {isLocked && (
          <p className="text-xs font-medium text-emerald-600">
            Your KYC has been verified. Documents are locked.
          </p>
        )}
        {shouldShowRequestUpdate && (
          <Button
            variant="outline"
            size="sm"
            onClick={requestKycUpdate}
            disabled={updateRequested}
          >
            {updateRequested ? "Update requested" : "Request KYC update"}
          </Button>
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
              disabled={isDisabled}
            >
              {idTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-600">
              {idNumberLabel || "ID number"}
            </label>
            <Input
              value={idNumber}
              onChange={(event) => setIdNumber(event.target.value)}
              placeholder={`Enter ${idNumberLabel?.toLowerCase() || "the ID number"}`}
              disabled={isDisabled}
            />
          </div>
          {idType === "PASSPORT" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-600">
                Passport expiry date
              </label>
              <Input
                type="date"
                value={idExpiryDate}
                onChange={(event) => setIdExpiryDate(event.target.value)}
                disabled={isDisabled}
              />
            </div>
          )}
          {!documentSlots && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-600">
                Upload documents
              </label>
              <Input
                type="file"
                multiple
                onChange={(event) => handleFiles(event.target.files)}
                disabled={isDisabled}
              />
              <p className="text-xs text-neutral-500">
                Accepted: JPG, PNG, WebP, PDF. Max 10MB.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-600">
              Reviewer notes
            </label>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Any extra context for the verification team"
              disabled={isDisabled}
            />
          </div>
        </div>

        {documentSlots && documentSlots.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-neutral-600">
              Required uploads
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {documentSlots.map((slot) => (
                <div
                  key={slot.key}
                  className="rounded-md border border-neutral-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-800">
                      {slot.label}
                      {slot.required ? " *" : ""}
                    </p>
                    {slot.multiple && (slot.maxCount ?? 1) > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          handleAddSlotInput(slot.key, slot.maxCount ?? 1)
                        }
                        disabled={isDisabled}
                      >
                        +
                      </Button>
                    )}
                  </div>
                  {slot.description && (
                    <p className="text-xs text-neutral-500">
                      {slot.description}
                    </p>
                  )}
                  {Array.from({
                    length: Math.max(slotInputCounts[slot.key] ?? 1, 1),
                  }).map((_, index) => (
                    <Input
                      key={`${slot.key}-${index}`}
                      type="file"
                      multiple={slot.multiple}
                      className="mt-2"
                      onChange={(event) =>
                        handleSlotFiles(slot.docType, event.target.files)
                      }
                      disabled={isDisabled}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {documentChecklist && documentChecklist.length > 0 && (
          <div className="rounded-md border border-neutral-100 bg-neutral-50 p-4 text-xs text-neutral-600">
            <p className="mb-2 font-semibold text-neutral-700">
              Recommended documents
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {documentChecklist.map((doc) => (
                <div key={doc.title} className="rounded-md bg-white p-3">
                  <p className="font-medium text-neutral-800">{doc.title}</p>
                  <p className="text-neutral-500">{doc.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
                {upload.status === "uploaded" && upload.url && (
                  <div className="mt-3">
                    <label className="text-xs font-medium text-neutral-600">
                      Document type
                    </label>
                    <select
                      value={docTypeSelections[upload.url] || "UNKNOWN"}
                      onChange={(event) =>
                        setDocTypeSelections((current) => ({
                          ...current,
                          [upload.url!]: event.target.value,
                        }))
                      }
                      disabled={isLocked}
                      className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-2 text-xs"
                    >
                      <option value="UNKNOWN">Unknown</option>
                      <option value="NATIONAL_ID">National ID</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="CERT_OF_INC">
                        Certificate of Incorporation
                      </option>
                      <option value="CR6">CR6 (Directors Register)</option>
                      <option value="CR5">CR5 (Company Address)</option>
                      <option value="MEM_ARTICLES">
                        Memorandum & Articles
                      </option>
                      <option value="REA_CERT">
                        Real Estate Certification
                      </option>
                      <option value="DIRECTOR_ID">Director ID</option>
                      <option value="PROOF_ADDRESS">Proof of Address</option>
                      <option value="AGENT_CERT">
                        Independent Agent Certificate
                      </option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="gap-2"
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending || isDisabled}
          >
            <UploadCloud className="h-4 w-4" />
            {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
          </Button>
          <Badge variant="outline" className="text-xs">
            {historyRecords.length > 0 ? overallStatus : "No submissions"}
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
                    <th className="px-3 py-2">Documents</th>
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
                        <div className="space-y-1">
                          {record.docUrls?.map((url: string, index: number) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-xs text-emerald-600 hover:underline"
                            >
                              {record.docTypes?.[index] || "Document"}
                            </a>
                          ))}
                        </div>
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
