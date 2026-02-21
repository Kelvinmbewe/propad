"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AuthDialog } from "./AuthDialog";
import { MessagingDrawer } from "./MessagingDrawer";

function buildNextUrl(pathname: string, params: URLSearchParams) {
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function MessagingOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const isOpen = searchParams.get("chatOpen") === "1";

  const payload = useMemo(
    () => ({
      conversationId: searchParams.get("conversationId") ?? undefined,
      listingId: searchParams.get("listingId") ?? undefined,
      recipientId: searchParams.get("recipientId") ?? undefined,
      companyId: searchParams.get("companyId") ?? undefined,
    }),
    [searchParams],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (status !== "authenticated") return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("chatAuth", "1");
    router.replace(buildNextUrl(pathname, next), { scroll: false });
  }, [isOpen, pathname, router, searchParams, status]);

  const closeOverlay = () => {
    const next = new URLSearchParams(searchParams.toString());
    [
      "chatOpen",
      "conversationId",
      "listingId",
      "recipientId",
      "companyId",
      "chatAuth",
    ].forEach((key) => next.delete(key));
    router.replace(buildNextUrl(pathname, next), { scroll: false });
  };

  if (!isOpen) return null;

  const shouldShowAuth = !session?.user?.id;
  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${buildNextUrl(pathname, new URLSearchParams(searchParams.toString()))}`
      : pathname;

  return (
    <>
      <AuthDialog
        open={shouldShowAuth}
        onOpenChange={(open) => {
          if (!open) closeOverlay();
        }}
        callbackUrl={callbackUrl}
        onSignedIn={() => {
          const next = new URLSearchParams(searchParams.toString());
          next.set("chatAuth", "1");
          router.replace(buildNextUrl(pathname, next), { scroll: false });
        }}
      />

      <MessagingDrawer
        open={!shouldShowAuth}
        onOpenChange={(open) => {
          if (!open) closeOverlay();
        }}
        payload={payload}
      />
    </>
  );
}
