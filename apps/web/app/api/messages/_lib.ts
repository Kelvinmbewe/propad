import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireMessagingUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, error: null };
}
