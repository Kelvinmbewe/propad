import { NextResponse } from "next/server";
import {
  clampInt,
  fetchPropertiesInRadius,
  parseNumber,
} from "@/app/api/home/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const currentId = url.searchParams.get("currentId") ?? "";
    const lat = parseNumber(url.searchParams.get("lat"));
    const lng = parseNumber(url.searchParams.get("lng"));
    const intent =
      url.searchParams.get("intent") === "TO_RENT" ? "RENT" : "SALE";
    const radiusKm = clampInt(
      parseNumber(url.searchParams.get("radiusKm")),
      10,
      2,
      25,
    );
    const referencePrice = parseNumber(url.searchParams.get("price"));

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ items: [] });
    }

    const base = await fetchPropertiesInRadius({
      centerLat: lat,
      centerLng: lng,
      radiusKm,
      mode: intent,
      verifiedOnly: false,
      limit: 18,
    });

    const fallback =
      base.length < 6 && radiusKm < 25
        ? await fetchPropertiesInRadius({
            centerLat: lat,
            centerLng: lng,
            radiusKm: 25,
            mode: intent,
            verifiedOnly: false,
            limit: 24,
          })
        : [];

    const merged = [...base, ...fallback].filter(
      (item, idx, all) =>
        all.findIndex((entry) => entry.id === item.id) === idx,
    );

    const ranked = merged
      .filter((item) => item.id !== currentId)
      .map((item) => {
        const price = Number(item.price ?? 0);
        const trustComponent = Math.max(
          0,
          Math.min(1, Number(item.trustScore ?? 0) / 110),
        );
        const distanceComponent = Math.max(
          0,
          1 - Number(item.distanceKm ?? 99) / 25,
        );
        const priceComponent =
          typeof referencePrice === "number" && referencePrice > 0
            ? Math.max(0, 1 - Math.abs(price - referencePrice) / referencePrice)
            : 0.5;
        const rank =
          trustComponent * 0.45 +
          distanceComponent * 0.35 +
          priceComponent * 0.2;

        const suburb = item.suburbName ?? item.location?.suburb?.name;
        const city = item.cityName ?? item.location?.city?.name;
        const province = item.provinceName ?? item.location?.province?.name;

        return {
          id: item.id,
          title: item.title,
          price,
          currency: item.currency ?? "USD",
          bedrooms: item.bedrooms ?? null,
          bathrooms: item.bathrooms ?? null,
          areaSqm: item.areaSqm ?? item.commercialFields?.floorAreaSqm ?? null,
          locationText:
            [suburb, city, province].filter(Boolean).join(", ") || "Zimbabwe",
          imageUrl: item.media?.[0]?.url ?? null,
          trustScore: Number(item.trustScore ?? 0),
          distanceKm: Number(item.distanceKm ?? 0),
          listingIntent:
            item.listingIntent === "TO_RENT" ? "TO_RENT" : "FOR_SALE",
          rank,
        };
      })
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 8)
      .map(({ rank, ...item }) => item);

    return NextResponse.json({ items: ranked });
  } catch (error) {
    console.error("[properties/nearby]", error);
    return NextResponse.json({ items: [] });
  }
}
