"use client";

import { useState } from "react";
import { Button } from "@propad/ui";
import { useMessagingEntry } from "@/features/messaging/use-messaging-entry";

export function CompanyContactActions({
  companyId,
  phone,
  website,
}: {
  companyId: string;
  phone?: string | null;
  website?: string | null;
}) {
  const [isStarting, setIsStarting] = useState(false);
  const [showCallWarning, setShowCallWarning] = useState(false);
  const { openMessageDrawer } = useMessagingEntry();

  const onMessage = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      openMessageDrawer({ companyId });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 md:w-auto">
      <Button onClick={onMessage} disabled={isStarting}>
        {isStarting ? "Opening chat..." : "Message agency"}
      </Button>
      {phone ? (
        <>
          <Button variant="secondary" onClick={() => setShowCallWarning(true)}>
            Call
          </Button>
          {showCallWarning ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-medium">Security notice</p>
              <p className="mt-1">
                Calls outside PropAd are less secure. We recommend using PropAd
                Messenger first so your conversation stays protected and
                traceable.
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowCallWarning(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" asChild>
                  <a href={`tel:${String(phone).replace(/\s+/g, "")}`}>
                    Proceed to call
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      {website ? (
        <Button variant="secondary" asChild>
          <a href={website} target="_blank" rel="noreferrer">
            Website
          </a>
        </Button>
      ) : null}
    </div>
  );
}
