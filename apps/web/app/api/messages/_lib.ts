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

export function toMessagingApiErrorResponse(error: unknown, fallback: string) {
  const apiError = error as {
    message?: string;
    status?: number;
    payload?: unknown;
  };
  if (apiError?.status) {
    return NextResponse.json(
      { error: apiError.message || fallback, details: apiError.payload },
      { status: apiError.status || 500 },
    );
  }

  return NextResponse.json({ error: fallback }, { status: 500 });
}
