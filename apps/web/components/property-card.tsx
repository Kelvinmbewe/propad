"use client";

import {
  Badge,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@propad/ui";
import Image from "next/image";
import Link from "next/link";
import type { Property } from "@propad/sdk";
import clsx from "clsx";
import { motion } from "framer-motion";
import { formatCurrency, formatFriendlyDate } from "@/lib/formatters";
import { getImageUrl } from "@/lib/image-url";

interface PropertyCardProps {
  property: Property;
  highlighted?: boolean;
  appearanceOrder?: number;
}

export function PropertyCard({
  property,
  highlighted = false,
  appearanceOrder = 0,
}: PropertyCardProps) {
  const primaryImage = property.media?.[0]?.url
    ? getImageUrl(property.media[0].url)
    : null;
  const locationName =
    property.location.suburb?.name ??
    property.location.city?.name ??
    property.location.province?.name ??
    property.location.country?.name ??
    "Zimbabwe";
  const price = formatCurrency(property.price, property.currency);
  const availabilityLabel =
    property.availability === "DATE" && property.availableFrom
      ? `Available ${formatFriendlyDate(property.availableFrom)}`
      : "Available now";
  const furnishingLabel =
    property.furnishing && property.furnishing !== "NONE"
      ? `${property.furnishing === "FULLY" ? "Fully" : property.furnishing === "PARTLY" ? "Partly" : "Lightly"} furnished`
      : null;
  const floorArea = property.commercialFields?.floorAreaSqm;
  const parkingBays = property.commercialFields?.parkingBays;
  const verificationStatus = property.status;
  const verificationLevel = (property as any).verificationLevel;
  const showPending = verificationStatus === "PENDING_VERIFY";
  const showVerified =
    !showPending &&
    (verificationLevel === "VERIFIED" || verificationLevel === "TRUSTED");
  const isFeatured =
    (property as any).featuredListing?.status === "ACTIVE" ||
    (property as any).isFeatured;
  const isPromoted = (property as any).isPromoted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      whileFocus={{ y: -4 }}
      transition={{
        duration: 0.25,
        ease: "easeInOut",
        delay: Math.min(0.1, appearanceOrder * 0.05),
      }}
      className="h-full"
    >
      <Card
        className={clsx("h-full overflow-hidden transition-shadow", {
          "ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-100 shadow-lg":
            highlighted,
        })}
      >
        <Link href={`/listings/${property.id}`} className="group block h-full">
          {primaryImage ? (
            <div className="relative h-52 w-full overflow-hidden">
              <Image
                src={primaryImage}
                alt={`${property.type} in ${locationName}`}
                fill
                className="object-cover transition-transform duration-[var(--motion-duration)] ease-[var(--motion-ease)] group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
                {isPromoted ? (
                  <Badge className="bg-purple-600 text-white border-none shadow-md">
                    Promoted
                  </Badge>
                ) : null}
                {isFeatured ? (
                  <Badge className="bg-amber-400 text-slate-900 border-none shadow-md">
                    Featured
                  </Badge>
                ) : null}
              </div>
              {showPending ? (
                <Badge className="absolute left-3 top-3 bg-white/80 text-slate-900">
                  Pending Verify
                </Badge>
              ) : showVerified ? (
                <Badge className="absolute left-3 top-3 bg-emerald-600 text-white border-none">
                  Verified
                </Badge>
              ) : null}
            </div>
          ) : (
            <div className="flex h-52 w-full items-center justify-center bg-neutral-100 text-neutral-500">
              No image
            </div>
          )}
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="capitalize">{property.type.toLowerCase()}</span>
              <span className="text-base font-semibold">{price}</span>
            </CardTitle>
            <p className="text-sm text-neutral-500">{locationName}</p>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-neutral-600">
            <div className="flex flex-wrap gap-3 text-xs uppercase text-neutral-500">
              <span>{availabilityLabel}</span>
              {furnishingLabel ? <span>{furnishingLabel}</span> : null}
              {floorArea ? <span>{Math.round(floorArea)} sqm</span> : null}
              {parkingBays ? <span>{parkingBays} parking bays</span> : null}
            </div>
            {property.bedrooms ? (
              <span>{property.bedrooms} bedrooms</span>
            ) : null}
            {property.bathrooms ? (
              <span>{property.bathrooms} bathrooms</span>
            ) : null}
            {property.description ? (
              <p className="line-clamp-2">{property.description}</p>
            ) : null}
          </CardContent>
          <CardFooter className="flex items-center justify-between text-xs text-neutral-500">
            <span>{availabilityLabel}</span>
            <span className="font-medium">PropAd</span>
          </CardFooter>
        </Link>
      </Card>
    </motion.div>
  );
}
