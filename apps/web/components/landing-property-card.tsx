"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bath, BedDouble, Ruler } from "lucide-react";
import { getImageUrl } from "@/lib/image-url";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/property-placeholder";
import { TrustBadge, type TrustBreakdown } from "@/components/trust/TrustBadge";
import clsx from "clsx";

export interface LandingProperty {
  id: string;
  title: string;
  location: string;
  price: string;
  status?: "FOR SALE" | "FOR RENT";
  statusTone?: "sale" | "rent";
  imageUrl: string;
  beds: number;
  baths: number;
  area: number;
  listingIntent?: string | null;
  verificationLevel?: string | null;
  verificationStatus?: string | null;
  isFeatured?: boolean;
  trustScore?: number | null;
  trustMaxScore?: number | null;
  trustBreakdown?: TrustBreakdown;
}

const statusStyles: Record<"sale" | "rent", string> = {
  sale: "bg-emerald-500 text-white shadow-[0_12px_30px_-12px_rgba(16,185,129,0.7)]",
  rent: "bg-cyan-500 text-white shadow-[0_12px_30px_-12px_rgba(14,165,233,0.7)]",
};

export function LandingPropertyCard({
  property,
  variant = "default",
  className,
  onListingClick,
}: {
  property: LandingProperty;
  variant?: "default" | "compact" | "featured";
  className?: string;
  onListingClick?: (propertyId: string) => void;
}) {
  const router = useRouter();
  const intent: "sale" | "rent" = property.statusTone
    ? property.statusTone
    : property.listingIntent === "TO_RENT"
      ? "rent"
      : "sale";
  const statusLabel =
    property.status ?? (intent === "rent" ? "FOR RENT" : "FOR SALE");
  const verificationStatus =
    property.verificationStatus ?? (property as any).status;
  const verificationLevel =
    property.verificationLevel ?? (property as any).verificationLevel;
  const isFeatured =
    property.isFeatured ??
    (property as any).featuredListing?.status === "ACTIVE";
  const showPending = verificationStatus === "PENDING_VERIFY";
  const showVerified =
    !showPending &&
    (verificationLevel === "VERIFIED" || verificationLevel === "TRUSTED");
  const fallbackImage = (property as any).media?.[0]?.url;
  const imageUrl =
    property.imageUrl ??
    (fallbackImage ? getImageUrl(fallbackImage) : PROPERTY_PLACEHOLDER_IMAGE);
  const trustScore = Number(
    property.trustScore ?? (property as any).trustScore ?? 0,
  );
  const trustMaxScore = Number(property.trustMaxScore ?? 110);
  const trustBreakdown =
    property.trustBreakdown ?? (property as any).trustBreakdown ?? undefined;
  const isCompact = variant === "compact";
  const isFeaturedVariant = variant === "featured";
  const imageHeight = isCompact ? "h-56" : "h-64";
  const detailsHref = `/properties/${property.id}`;

  const shouldSkipCardNavigation = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest("a,button,input,textarea,select,[role='button']"),
    );
  };

  return (
    <motion.article
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={clsx(
        "group flex cursor-pointer flex-col overflow-hidden rounded-[24px] bg-card text-card-foreground shadow-lg ring-1 ring-border",
        isCompact && "shadow-sm",
        isFeaturedVariant &&
          "ring-amber-200 shadow-[0_30px_60px_-40px_rgba(251,191,36,0.6)]",
        className,
      )}
      role="link"
      tabIndex={0}
      aria-label={`Open listing ${property.title}`}
      onClick={(event) => {
        if (shouldSkipCardNavigation(event.target)) return;
        onListingClick?.(property.id);
        router.push(detailsHref);
      }}
      onKeyDown={(event) => {
        if (shouldSkipCardNavigation(event.target)) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onListingClick?.(property.id);
          router.push(detailsHref);
        }
      }}
    >
      <div className={clsx("relative overflow-hidden", imageHeight)}>
        <Image
          src={imageUrl}
          alt={property.title}
          fill
          sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-110"
        />
        <div
          className={clsx(
            "absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent",
            isCompact && "from-slate-950/60",
          )}
        />
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
          <span
            className={`rounded-full px-3 py-1 text-[11px] tracking-[0.3em] ${statusStyles[intent]}`}
          >
            {statusLabel}
          </span>
          {isFeatured ? (
            <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] tracking-[0.28em] text-slate-900">
              FEATURED
            </span>
          ) : null}
          {showPending ? (
            <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] tracking-[0.28em] text-slate-900">
              PENDING VERIFY
            </span>
          ) : null}
          {showVerified ? (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] tracking-[0.28em] text-white">
              VERIFIED
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-sm uppercase tracking-[0.28em] text-white/70">
            {property.location}
          </p>
          <h3 className="mt-1 text-2xl font-semibold">{property.title}</h3>
        </div>
      </div>
      <div
        className={clsx("flex flex-1 flex-col gap-4 p-6", isCompact && "gap-3")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground">
          <span className="text-sm font-medium uppercase tracking-[0.35em] text-muted-foreground">
            Starting at
          </span>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-card-foreground">
              {property.price}
            </span>
            <TrustBadge
              trustScore={trustScore}
              maxScore={trustMaxScore}
              breakdown={trustBreakdown}
              size="sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            {property.beds} Beds
          </span>
          <span className="flex items-center gap-2">
            <Bath className="h-4 w-4" />
            {property.baths} Baths
          </span>
          <span className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            {property.area} m²
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
            Listed on PropAd
          </span>
          <Link
            href={detailsHref}
            onClick={() => onListingClick?.(property.id)}
            className="text-xs font-semibold text-muted-foreground hover:text-emerald-500"
          >
            View listing →
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
