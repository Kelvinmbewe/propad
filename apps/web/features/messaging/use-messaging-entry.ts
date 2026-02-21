"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

function toUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function useMessagingEntry() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openMessageDrawer = (payload: {
    conversationId?: string;
    listingId?: string;
    recipientId?: string;
    companyId?: string;
  }) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("chatOpen", "1");
    if (payload.conversationId)
      next.set("conversationId", payload.conversationId);
    else next.delete("conversationId");
    if (payload.listingId) next.set("listingId", payload.listingId);
    else next.delete("listingId");
    if (payload.recipientId) next.set("recipientId", payload.recipientId);
    else next.delete("recipientId");
    if (payload.companyId) next.set("companyId", payload.companyId);
    else next.delete("companyId");

    router.replace(toUrl(pathname, next), { scroll: false });
  };

  return { openMessageDrawer };
}
