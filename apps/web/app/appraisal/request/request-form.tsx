"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button, Input, Textarea, notify } from "@propad/ui";

export function AppraisalRequestForm({
  company,
  companyId,
}: {
  company: any;
  companyId: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState("House");
  const [intent, setIntent] = useState("FOR_SALE");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const intro = useMemo(() => {
    if (!company?.name) return "Requesting market appraisal.";
    return `Requesting market appraisal from ${company.name}.`;
  }, [company?.name]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!companyId) {
      notify.error("Agency not found for this appraisal request.");
      return;
    }

    if (!session?.user?.id) {
      const callbackUrl =
        typeof window !== "undefined"
          ? window.location.href
          : `/appraisal/request?companyId=${encodeURIComponent(companyId)}`;
      signIn(undefined, { callbackUrl });
      return;
    }

    setSubmitting(true);
    try {
      const startResponse = await fetch("/api/messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (!startResponse.ok) throw new Error("Could not start conversation");
      const startPayload = (await startResponse.json()) as {
        threadId?: string;
      };
      if (!startPayload.threadId) throw new Error("Missing thread id");

      const lines = [
        intro,
        `Address/area: ${address || "Not provided"}`,
        `Property type: ${propertyType}`,
        `Intent: ${intent === "TO_RENT" ? "To Rent" : "For Sale"}`,
        `Notes: ${notes || "None"}`,
      ];

      const sendResponse = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: startPayload.threadId,
          body: lines.join("\n"),
        }),
      });

      if (!sendResponse.ok) throw new Error("Could not send appraisal request");

      notify.success("Appraisal request sent.");
      router.push(`/dashboard/messages/${startPayload.threadId}`);
    } catch {
      notify.error("Could not submit appraisal request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
        <p className="font-medium text-foreground">
          Agency: {company?.name ?? "Selected agency"}
        </p>
        <p className="text-muted-foreground">
          Your request is sent via PropAd Messenger for safer communication.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">
          Property address / area
        </span>
        <Input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="e.g. Borrowdale, Harare"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Property type</span>
          <select
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option>House</option>
            <option>Apartment</option>
            <option>Townhouse</option>
            <option>Commercial</option>
            <option>Land</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">
            Appraisal purpose
          </span>
          <select
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="FOR_SALE">For Sale</option>
            <option value="TO_RENT">For Rent</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Extra details</span>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Tell the agency about timeline, size, condition, and anything relevant."
          rows={5}
        />
      </label>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Sending request..." : "Send appraisal request"}
      </Button>
    </form>
  );
}
