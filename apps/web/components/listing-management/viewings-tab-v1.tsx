"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Skeleton,
  Textarea,
  notify,
} from "@propad/ui";
import { Calendar, Clock, MapPin, Send } from "lucide-react";
import { getPublicApiBaseUrl } from "@/lib/api-base-url";

type Viewing = {
  id: string;
  viewerId: string;
  scheduledAt: string;
  status: string;
  notes?: string | null;
  viewer?: { id: string; name?: string | null; email?: string | null };
  locationLat?: number | null;
  locationLng?: number | null;
};

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export function ListingViewingsTabV1({ propertyId }: { propertyId: string }) {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const apiBaseUrl = getPublicApiBaseUrl();
  const queryClient = useQueryClient();

  const [selectedViewingId, setSelectedViewingId] = useState<string | null>(
    null,
  );
  const [decisionState, setDecisionState] = useState<{
    id: string;
    action: "APPROVE" | "REJECT" | "PROPOSE";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [proposedAt, setProposedAt] = useState("");
  const [chatBody, setChatBody] = useState("");

  const viewingsQuery = useQuery<Viewing[]>({
    queryKey: ["listing-management", "viewings", propertyId],
    queryFn: async () => {
      const response = await fetch(
        `${apiBaseUrl}/properties/${propertyId}/viewings`,
        {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
        },
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: Boolean(apiBaseUrl),
    refetchInterval: 12000,
    initialData: [],
  });

  const sortedViewings = useMemo(
    () =>
      (viewingsQuery.data ?? [])
        .slice()
        .sort(
          (left, right) =>
            new Date(right.scheduledAt).getTime() -
            new Date(left.scheduledAt).getTime(),
        ),
    [viewingsQuery.data],
  );

  const selectedViewing =
    sortedViewings.find((item) => item.id === selectedViewingId) ??
    sortedViewings[0] ??
    null;

  const ensureConversation = useMutation({
    mutationFn: async (viewerId: string) => {
      const response = await fetch(`/api/messages/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: propertyId, recipientId: viewerId }),
      });
      if (!response.ok) throw new Error("Failed to open viewing chat");
      return response.json();
    },
  });

  const conversationQuery = useQuery<any>({
    queryKey: [
      "listing-management",
      "viewing-conversation",
      selectedViewing?.viewerId,
    ],
    queryFn: async () => {
      if (!selectedViewing?.viewerId) return null;
      const conversation = await ensureConversation.mutateAsync(
        selectedViewing.viewerId,
      );
      return conversation;
    },
    enabled: Boolean(selectedViewing?.viewerId),
    retry: 0,
  });

  const messagesQuery = useQuery<Message[]>({
    queryKey: [
      "listing-management",
      "viewing-chat-thread",
      conversationQuery.data?.id,
    ],
    queryFn: async () => {
      if (!conversationQuery.data?.id) return [];
      const response = await fetch(
        `/api/messages/conversations/${conversationQuery.data.id}/messages`,
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: Boolean(conversationQuery.data?.id),
    initialData: [],
    refetchInterval: 8000,
  });

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!conversationQuery.data?.id) return;
      const response = await fetch(`/api/messages/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationQuery.data.id,
          body,
        }),
      });
      if (!response.ok) throw new Error("Failed to send message");
    },
    onSuccess: () => {
      setChatBody("");
      queryClient.invalidateQueries({
        queryKey: [
          "listing-management",
          "viewing-chat-thread",
          conversationQuery.data?.id,
        ],
      });
    },
    onError: (error: any) =>
      notify.error(error?.message || "Failed to send message"),
  });

  const decisionMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      action: "APPROVE" | "REJECT" | "PROPOSE";
      reason?: string;
      proposedAt?: string;
    }) => {
      const status =
        payload.action === "APPROVE"
          ? "CONFIRMED"
          : payload.action === "REJECT"
            ? "CANCELLED"
            : "POSTPONED";

      const response = await fetch(
        `${apiBaseUrl}/properties/viewings/${payload.id}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            status,
            notes:
              payload.action === "PROPOSE"
                ? `Proposed new time: ${payload.proposedAt}`
                : payload.reason,
          }),
        },
      );
      if (!response.ok) throw new Error("Failed to update viewing");

      if (payload.action === "PROPOSE" && payload.proposedAt) {
        await sendMessage.mutateAsync(
          `Reschedule proposal: ${new Date(payload.proposedAt).toLocaleString()}`,
        );
      }
      if (payload.action === "REJECT" && payload.reason) {
        await sendMessage.mutateAsync(`Viewing rejected: ${payload.reason}`);
      }
      if (payload.action === "APPROVE") {
        await sendMessage.mutateAsync(
          "Viewing approved. See you at the agreed time.",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["listing-management", "viewings", propertyId],
      });
      setDecisionState(null);
      setReason("");
      setProposedAt("");
      notify.success("Viewing updated");
    },
    onError: (error: any) =>
      notify.error(error?.message || "Failed to update viewing"),
  });

  if (viewingsQuery.isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!sortedViewings.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No viewings yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Viewings queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedViewings.map((viewing) => (
            <button
              key={viewing.id}
              type="button"
              onClick={() => setSelectedViewingId(viewing.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedViewing?.id === viewing.id
                  ? "border-emerald-300 bg-emerald-50/70"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {viewing.viewer?.name || viewing.viewer?.email || "Applicant"}
                </p>
                <Badge variant="outline">{viewing.status}</Badge>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {new Date(viewing.scheduledAt).toLocaleString()}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                On-site / logistics chat available
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          {selectedViewing ? (
            <>
              <div className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {selectedViewing.viewer?.name || "Viewing"}
                  </h4>
                  <Badge>{selectedViewing.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(selectedViewing.scheduledAt).toLocaleString()}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedViewing.locationLat && selectedViewing.locationLng
                    ? `${selectedViewing.locationLat}, ${selectedViewing.locationLng}`
                    : "No pin yet"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      setDecisionState({
                        id: selectedViewing.id,
                        action: "APPROVE",
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setDecisionState({
                        id: selectedViewing.id,
                        action: "REJECT",
                      })
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDecisionState({
                        id: selectedViewing.id,
                        action: "PROPOSE",
                      })
                    }
                  >
                    Propose new time
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  Viewing chat
                </p>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (
                        selectedViewing.locationLat &&
                        selectedViewing.locationLng
                      ) {
                        const mapsUrl = `https://maps.google.com/?q=${selectedViewing.locationLat},${selectedViewing.locationLng}`;
                        sendMessage.mutate(`Location pin: ${mapsUrl}`);
                      } else {
                        notify.error("No listing pin available yet");
                      }
                    }}
                  >
                    Share location pin
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDecisionState({
                        id: selectedViewing.id,
                        action: "PROPOSE",
                      })
                    }
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      decisionMutation.mutate({
                        id: selectedViewing.id,
                        action: "APPROVE",
                        reason: "Check-in completed",
                      });
                      sendMessage.mutate(
                        "Check-in complete. Viewing attended.",
                      );
                    }}
                  >
                    Check-in
                  </Button>
                </div>

                <ScrollArea className="h-[280px] rounded-lg border bg-muted/20 p-3">
                  <div className="space-y-2">
                    {(messagesQuery.data ?? []).map((message) => {
                      const isMine = message.senderId === session?.user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                              isMine ? "bg-emerald-600 text-white" : "bg-white"
                            }`}
                          >
                            {message.body}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="mt-2 flex items-end gap-2">
                  <Input
                    value={chatBody}
                    onChange={(event) => setChatBody(event.target.value)}
                    placeholder="Message about logistics"
                  />
                  <Button
                    size="icon"
                    aria-label="Send viewing chat message"
                    disabled={!chatBody.trim() || sendMessage.isPending}
                    onClick={() => sendMessage.mutate(chatBody.trim())}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(decisionState)}
        onOpenChange={() => setDecisionState(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionState?.action === "APPROVE"
                ? "Approve viewing"
                : decisionState?.action === "REJECT"
                  ? "Reject viewing"
                  : "Propose new viewing time"}
            </DialogTitle>
          </DialogHeader>
          {decisionState?.action === "PROPOSE" ? (
            <div className="space-y-2">
              <Label>New proposed date and time</Label>
              <Input
                type="datetime-local"
                value={proposedAt}
                onChange={(event) => setProposedAt(event.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Optional note to applicant"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecisionState(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                decisionMutation.isPending ||
                (decisionState?.action === "PROPOSE" && !proposedAt)
              }
              onClick={() => {
                if (!decisionState) return;
                decisionMutation.mutate({
                  id: decisionState.id,
                  action: decisionState.action,
                  reason,
                  proposedAt,
                });
              }}
            >
              {decisionMutation.isPending ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
