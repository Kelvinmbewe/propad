function parseNumber(value: string | null | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeApiBaseUrl(baseUrl: string) {
  const withProtocol = baseUrl.startsWith("http")
    ? baseUrl
    : `http://${baseUrl}`;
  const trimmed = withProtocol.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function getApiBaseUrl() {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3001";
  return normalizeApiBaseUrl(baseUrl);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "1";
    const lat = parseNumber(url.searchParams.get("lat"));
    const lng = parseNumber(url.searchParams.get("lng"));
    const radiusKm = parseNumber(url.searchParams.get("radiusKm"));

    const params = new URLSearchParams();
    if (lat !== undefined) params.set("lat", lat.toFixed(6));
    if (lng !== undefined) params.set("lng", lng.toFixed(6));
    if (radiusKm !== undefined) params.set("radiusKm", String(radiusKm));

    const response = await fetch(
      `${getApiBaseUrl()}/properties/home/counts?${params.toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Counts request failed: ${response.status}`);
    }

    const data = await response.json();
    return new Response(
      JSON.stringify(
        debug
          ? {
              ...data,
              debug: {
                baseUrl: getApiBaseUrl(),
                params: Object.fromEntries(params.entries()),
              },
            }
          : data,
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          "x-home-base-url": getApiBaseUrl(),
        },
      },
    );
  } catch (error) {
    console.error("[home/counts]", error);
    return new Response(
      JSON.stringify({
        verifiedListingsCount: 0,
        partnersCount: 0,
        newListings30dCount: 0,
        trustChecksCount: 0,
        ...(request.url.includes("debug=1")
          ? { debug: { error: String(error), baseUrl: getApiBaseUrl() } }
          : {}),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "x-home-base-url": getApiBaseUrl(),
        },
      },
    );
  }
}
