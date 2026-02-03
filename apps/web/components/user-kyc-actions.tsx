"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, notify } from "@propad/ui";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";

export function UserKycActions({
  userId,
  documents,
}: {
  userId: string;
  documents: Array<{ id: string; status: string }>;
}) {
  const { data: session } = useSession();
  const apiBaseUrl = getRequiredPublicApiBaseUrl();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const runAction = async (action: string) => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/admin/users/${userId}/kyc/action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ action, notes: notes || undefined }),
        },
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to update KYC");
      }
      notify.success("KYC updated");
    } catch (error: any) {
      notify.error(error.message || "Failed to update KYC");
    } finally {
      setLoading(false);
    }
  };

  const verifyDocument = async (
    documentId: string,
    status: "VERIFIED" | "REJECTED",
  ) => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/admin/documents/${documentId}/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ status, notes: notes || undefined }),
        },
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to verify document");
      }
      notify.success("Document updated");
    } catch (error: any) {
      notify.error(error.message || "Failed to verify document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes for the reviewer log"
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={loading} onClick={() => runAction("approve")}>
          Approve
        </Button>
        <Button
          disabled={loading}
          variant="outline"
          onClick={() => runAction("request_info")}
        >
          Request info
        </Button>
        <Button
          disabled={loading}
          variant="outline"
          onClick={() => runAction("reject")}
        >
          Reject
        </Button>
        <Button
          disabled={loading}
          variant="outline"
          onClick={() => runAction("suspend")}
        >
          Suspend
        </Button>
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
          >
            <div className="text-sm text-slate-600">
              Document status: {doc.status}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => verifyDocument(doc.id, "VERIFIED")}
              >
                Mark verified
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => verifyDocument(doc.id, "REJECTED")}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
