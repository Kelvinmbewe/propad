import { notFound } from "next/navigation";
import { Badge } from "@propad/ui";
import { LandingNav } from "@/components/landing-nav";
import { ViewTracker } from "@/components/view-tracker";
import { ListingGallery } from "@/components/property-detail/listing-gallery";
import { PropertyOffersCard } from "@/components/property-detail/property-offers-card";
import { ListingSidebar } from "@/components/property-detail/listing-sidebar";
import { ListingLocationMap } from "@/components/property-detail/listing-location-map";
import { NearbyListingsPanel } from "@/components/property-detail/nearby-listings-panel";
import { formatCurrency } from "@/lib/formatters";
import { serverPublicApiRequest } from "@/lib/server-api";

export const dynamic = "force-dynamic";

interface PropertyDetails {
  id: string;
  title: string;
  description?: string | null;
  price: string | number;
  currency?: string;
  type: string;
  listingIntent: "FOR_SALE" | "TO_RENT";
  status?: string;
  verificationLevel?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  furnishing?: string | null;
  amenities?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  media?: Array<{ id?: string; url: string }>;
  location?: {
    lat?: number;
    lng?: number;
    suburb?: { name?: string };
    city?: { name?: string };
    province?: { name?: string };
  };
  suburbName?: string | null;
  cityName?: string | null;
  provinceName?: string | null;
  landlordId?: string | null;
  agentOwnerId?: string | null;
  landlord?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
  } | null;
  agentOwner?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
  } | null;
  assignedAgent?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
  } | null;
  agency?: { id?: string; name?: string | null; phone?: string | null } | null;
  commercialFields?: {
    floorAreaSqm?: number | null;
    parkingBays?: number | null;
    powerPhase?: string | null;
    loadingBay?: boolean | null;
  } | null;
}

async function getProperty(id: string) {
  try {
    return await serverPublicApiRequest<PropertyDetails>(`/properties/${id}`);
  } catch {
    return null;
  }
}

function locationText(property: PropertyDetails) {
  return [
    property.suburbName ?? property.location?.suburb?.name,
    property.cityName ?? property.location?.city?.name,
    property.provinceName ?? property.location?.province?.name,
  ]
    .filter(Boolean)
    .join(", ");
}

function entityForSidebar(property: PropertyDetails) {
  if (property.agency?.name) {
    return {
      name: property.agency.name,
      roleLabel: "Agency",
      phone: property.agency.phone,
      profileHref: property.agency.id
        ? `/agencies/${property.agency.id}`
        : "/agencies",
    };
  }
  if (property.assignedAgent?.name) {
    return {
      name: property.assignedAgent.name,
      roleLabel: "Agent",
      phone: property.assignedAgent.phone,
      profileHref: property.assignedAgent.id
        ? `/agents/${property.assignedAgent.id}`
        : "/agencies",
    };
  }
  if (property.agentOwner?.name) {
    return {
      name: property.agentOwner.name,
      roleLabel: "Agent",
      phone: property.agentOwner.phone,
      profileHref: property.agentOwner.id
        ? `/agents/${property.agentOwner.id}`
        : "/agencies",
    };
  }
  return {
    name: property.landlord?.name ?? "Property owner",
    roleLabel: "Landlord",
    phone: property.landlord?.phone,
    profileHref: null,
  };
}

function offeringExtras(property: PropertyDetails) {
  const extras: string[] = [];
  const amenityText = (property.amenities ?? []).map((entry) =>
    entry.toLowerCase(),
  );
  const hasAmenity = (name: string) =>
    amenityText.some((entry) => entry.includes(name));
  if (hasAmenity("borehole")) extras.push("Borehole");
  if (hasAmenity("solar")) extras.push("Solar");
  if (hasAmenity("security")) extras.push("Security");
  if (hasAmenity("water")) extras.push("Water");
  if (hasAmenity("backup") || property.commercialFields?.powerPhase)
    extras.push("Power backup");
  if (property.commercialFields?.loadingBay) extras.push("Loading bay");
  return extras;
}

export default async function PropertyDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const property = await getProperty(params.id);
  if (!property) notFound();

  const location = locationText(property) || "Zimbabwe";
  const price = formatCurrency(
    Number(property.price ?? 0),
    property.currency ?? "USD",
  );
  const isRent = property.listingIntent === "TO_RENT";
  const verificationStatus = (property.status ?? "").toUpperCase();
  const verificationLevel = (property.verificationLevel ?? "").toUpperCase();
  const isVerified =
    verificationLevel === "VERIFIED" || verificationLevel === "TRUSTED";
  const extras = offeringExtras(property);
  const lat =
    typeof property.location?.lat === "number"
      ? property.location.lat
      : undefined;
  const lng =
    typeof property.location?.lng === "number"
      ? property.location.lng
      : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <ViewTracker propertyId={property.id} />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <ListingGallery media={property.media ?? []} title={property.title} />

          <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-foreground">
                  {property.title}
                </h1>
                <p className="text-sm text-muted-foreground">{location}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-600 text-white">
                    {isRent ? "FOR RENT" : "FOR SALE"}
                  </Badge>
                  <Badge variant="secondary">
                    {isVerified ? "VERIFIED" : "PENDING_VERIFY"}
                  </Badge>
                  {verificationStatus ? (
                    <Badge variant="outline">{verificationStatus}</Badge>
                  ) : null}
                </div>
              </div>

              <p className="text-3xl font-semibold text-emerald-600">
                {price}
                {isRent ? (
                  <span className="ml-1 text-base text-muted-foreground">
                    /month
                  </span>
                ) : null}
              </p>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <PropertyOffersCard
                bedrooms={property.bedrooms}
                bathrooms={property.bathrooms}
                floorArea={
                  property.areaSqm ??
                  property.commercialFields?.floorAreaSqm ??
                  null
                }
                propertyType={property.type}
                furnished={property.furnishing}
                parking={property.commercialFields?.parkingBays ?? null}
                extras={extras}
                createdAt={property.createdAt}
                updatedAt={property.updatedAt}
              />

              <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
                <h2 className="text-lg font-semibold text-foreground">
                  Description
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {property.description ||
                    "No description available for this listing yet."}
                </p>
              </section>

              <ListingLocationMap
                lat={lat}
                lng={lng}
                locationLabel={location}
              />

              <NearbyListingsPanel
                currentId={property.id}
                lat={lat}
                lng={lng}
                intent={property.listingIntent}
                price={Number(property.price ?? 0)}
                locationLabel={
                  property.suburbName ?? property.cityName ?? location
                }
                areaQuery={property.suburbName ?? property.cityName ?? location}
              />
            </div>

            <ListingSidebar
              propertyId={property.id}
              propertyTitle={property.title}
              landlordId={property.landlord?.id ?? property.landlordId}
              agentOwnerId={property.agentOwner?.id ?? property.agentOwnerId}
              entity={entityForSidebar(property)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
