import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getApiBaseUrl } from "@/app/api/home/_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  const accessToken = session?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const response = await fetch(`${getApiBaseUrl()}/saved-searches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json({ error }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
