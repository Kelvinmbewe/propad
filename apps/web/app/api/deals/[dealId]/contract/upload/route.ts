import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServerApiBaseUrl } from "@propad/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ dealId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dealId } = await context.params;
  const formData = await request.formData();

  try {
    const accessToken = (session as any)?.accessToken as string | undefined;

    const response = await fetch(
      `${getServerApiBaseUrl()}/deals/${dealId}/contract/upload`,
      {
        method: "POST",
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        body: formData,
      },
    );

    const text = await response.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {};
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.message || payload?.error || "Upload failed" },
        { status: response.status },
      );
    }
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 },
    );
  }
}
