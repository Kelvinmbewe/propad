"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
  Badge,
} from "@propad/ui";
import type { PropertyManagement as PropertyManagementType } from "@propad/sdk";
import { useSdkClient } from "@/hooks/use-sdk-client";
import { formatCurrency } from "@/lib/formatters";
import { getImageUrl } from "@/lib/image-url";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/property-placeholder";
import Link from "next/link";
import { MapPin, Home } from "lucide-react";
import { ClientState } from "@/components/client-state";

export function PropertyManagement() {
  const { sdk, status, message } = useSdkClient();

  const {
    data: properties,
    isLoading: loadingProperties,
    isError: propertiesError,
    error: propertiesErrorDetails,
  } = useQuery({
    queryKey: ["properties:owned"],
    queryFn: async () => {
      try {
        if (!sdk) {
          return [];
        }
        const result = await sdk.properties.listOwned();
        return result;
      } catch (error) {
        console.error("Failed to load properties:", error);
        throw error;
      }
    },
    enabled: status === "ready",
    retry: 1,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Group properties by status/type
  const groupedProperties = useMemo(() => {
    if (!properties || properties.length === 0) {
      return {};
    }

    const groups: Record<string, PropertyManagementType[]> = {
      "Active Listings": [],
      Drafts: [],
      Archived: [],
    };

    properties.forEach((property) => {
      if (property.status === "DRAFT") {
        groups["Drafts"].push(property);
      } else if (property.status === "ARCHIVED") {
        groups["Archived"].push(property);
      } else {
        groups["Active Listings"].push(property); // Includes VERIFIED, PENDING_VERIFY, etc.
      }
    });

    return groups;
  }, [properties]);

  if (status !== "ready") {
    return (
      <ClientState
        status={status}
        message={message}
        title="Listings access"
        actionLabel="Back to dashboard"
        actionHref="/dashboard"
      />
    );
  }

  if (loadingProperties) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  if (propertiesError) {
    const errorMessage =
      propertiesErrorDetails instanceof Error
        ? propertiesErrorDetails.message
        : "Unknown error";
    console.error("Properties error:", propertiesErrorDetails);
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12 border-2 border-dashed border-red-200 rounded-xl bg-red-50/50">
        <p className="text-sm text-red-600 font-semibold">
          We could not load your listings at this time.
        </p>
        <p className="text-xs text-red-500">Error: {errorMessage}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12 border-2 border-dashed rounded-xl bg-neutral-50/50">
        <Home className="h-12 w-12 text-neutral-300" />
        <p className="text-sm text-neutral-600">
          No listings yet. Drafts and submitted listings show here too.
        </p>
        <Link href="/dashboard/listings/new">
          <Button>List New Property</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Your Properties</h2>
        <Link href="/dashboard/listings/new">
          <Button>List New Property</Button>
        </Link>
      </div>

      {Object.entries(groupedProperties).map(([groupName, groupProperties]) => {
        if (groupProperties.length === 0) return null;

        return (
          <div key={groupName} className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900 border-b pb-2">
              {groupName}{" "}
              <span className="text-neutral-500 font-normal text-sm ml-2">
                ({groupProperties.length})
              </span>
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {groupProperties.map((property) => {
                const safePrice = Number(property.price);
                const priceLabel = formatCurrency(safePrice, property.currency);
                const locationLabel = [
                  property.suburbName ?? property.location.suburb?.name,
                  property.cityName ?? property.location.city?.name,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <Card
                    key={property.id}
                    className="overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-40 bg-neutral-100 relative">
                      <img
                        src={
                          property.media?.[0]?.url
                            ? getImageUrl(property.media[0].url)
                            : PROPERTY_PLACEHOLDER_IMAGE
                        }
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={
                            property.status === "VERIFIED"
                              ? "default"
                              : property.status === "DRAFT"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {property.status}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle
                        className="text-base font-semibold truncate"
                        title={property.title}
                      >
                        {property.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" />{" "}
                        {locationLabel || "No location set"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                        {priceLabel}
                        <span className="text-xs font-normal text-neutral-500">
                          {property.listingIntent === "TO_RENT"
                            ? "/ month"
                            : ""}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3 border-t bg-neutral-50/50">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                        {/* Primary Action: Manage - full width on mobile */}
                        <Link
                          href={`/dashboard/listings/${property.id}`}
                          className="col-span-2 sm:col-span-1"
                        >
                          <Button
                            variant="default"
                            className="w-full"
                            size="sm"
                          >
                            Manage
                          </Button>
                        </Link>

                        {/* Secondary Actions: Edit & Delete */}
                        <Link href={`/dashboard/listings/${property.id}/edit`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            Edit
                          </Button>
                        </Link>
                        <Link
                          href={`/dashboard/listings/${property.id}/delete`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </Link>

                        {/* Status Actions: Publish/Pause/Unpause/Restore */}
                        {property.status === "DRAFT" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (
                                confirm(
                                  "Publish this listing? It will be submitted for verification.",
                                )
                              ) {
                                if (!sdk) {
                                  alert("Service unavailable. Please retry.");
                                  return;
                                }
                                try {
                                  await sdk.request(
                                    `properties/${property.id}/publish`,
                                    { method: "PATCH" },
                                  );
                                  window.location.reload();
                                } catch (err) {
                                  alert("Failed to publish");
                                }
                              }
                            }}
                          >
                            Publish
                          </Button>
                        )}

                        {/* Pause: Available for VERIFIED and PENDING_VERIFY */}
                        {(property.status === "VERIFIED" ||
                          property.status === "PENDING_VERIFY") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (!sdk) {
                                alert("Service unavailable. Please retry.");
                                return;
                              }
                              if (
                                confirm(
                                  "Pause this listing? It will be archived and hidden from public search. You can restore it later.",
                                )
                              ) {
                                try {
                                  await sdk.request(
                                    `properties/${property.id}/status`,
                                    {
                                      method: "PATCH",
                                      body: { status: "ARCHIVED" },
                                    },
                                  );
                                  window.location.reload();
                                } catch (err) {
                                  alert("Failed to pause listing");
                                }
                              }
                            }}
                          >
                            Pause
                          </Button>
                        )}

                        {/* Unpause: Available for PUBLISHED (paused) listings */}
                        {property.status === "PUBLISHED" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (!sdk) {
                                alert("Service unavailable. Please retry.");
                                return;
                              }
                              if (
                                confirm(
                                  "Unpause this listing? It will be resubmitted for verification.",
                                )
                              ) {
                                try {
                                  await sdk.request(
                                    `properties/${property.id}/publish`,
                                    { method: "PATCH" },
                                  );
                                  window.location.reload();
                                } catch (err) {
                                  alert("Failed to unpause listing");
                                }
                              }
                            }}
                          >
                            Unpause
                          </Button>
                        )}

                        {/* Restore: Available for ARCHIVED listings */}
                        {property.status === "ARCHIVED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (!sdk) {
                                alert("Service unavailable. Please retry.");
                                return;
                              }
                              if (confirm("Restore this listing to draft?")) {
                                try {
                                  await sdk.request(
                                    `properties/${property.id}/status`,
                                    {
                                      method: "PATCH",
                                      body: { status: "DRAFT" },
                                    },
                                  );
                                  window.location.reload();
                                } catch (err) {
                                  alert("Failed to restore listing");
                                }
                              }
                            }}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
