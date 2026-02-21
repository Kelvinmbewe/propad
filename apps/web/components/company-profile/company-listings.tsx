"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Switch } from "@propad/ui";
import { getImageUrl } from "@/lib/image-url";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/property-placeholder";
import { useCompanyListings } from "@/hooks/use-company-profile";

export function CompanyListings({
  companyId,
  initialData,
}: {
  companyId: string;
  initialData: any;
}) {
  const [intent, setIntent] = useState<"ALL" | "FOR_SALE" | "TO_RENT">("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [sort, setSort] = useState<
    "TRUST" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC"
  >("TRUST");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);

  const listingsQuery = useCompanyListings(
    companyId,
    { intent, verifiedOnly, sort, page, pageSize: 12 },
    initialData,
  );

  const items = listingsQuery.data?.items ?? [];
  const meta = listingsQuery.data?.meta ?? { page: 1, totalPages: 1 };
  const stats = listingsQuery.data?.stats ?? {};

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "FOR_SALE", "TO_RENT"] as const).map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={intent === tab ? "default" : "secondary"}
            onClick={() => {
              setIntent(tab);
              setPage(1);
            }}
          >
            {tab === "ALL"
              ? "All"
              : tab === "FOR_SALE"
                ? "For Sale"
                : "To Rent"}
          </Button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Verified only
          <Switch
            checked={verifiedOnly}
            onCheckedChange={(checked) => {
              setVerifiedOnly(checked);
              setPage(1);
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as any);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="TRUST">Sort: Trust</option>
          <option value="NEWEST">Sort: Newest</option>
          <option value="PRICE_DESC">Sort: Price high-low</option>
          <option value="PRICE_ASC">Sort: Price low-high</option>
        </select>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setView((value) => (value === "list" ? "grid" : "list"))
          }
        >
          {view === "list" ? "Grid" : "List"} view
        </Button>
      </div>

      {listingsQuery.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : !items.length ? (
        <div className="rounded-xl border border-dashed border-border bg-muted p-6 text-sm text-muted-foreground">
          No active listings for this filter.
          {verifiedOnly && Number(stats?.activeListingsCount ?? 0) > 0 ? (
            <div className="mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setVerifiedOnly(false);
                  setPage(1);
                }}
              >
                Show all active listings
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={
            view === "grid" ? "grid gap-3 md:grid-cols-2" : "space-y-3"
          }
        >
          {items.map((item: any) => (
            <Link
              key={item.id}
              href={`/properties/${item.id}`}
              className="flex gap-3 rounded-xl border border-border bg-background p-3 hover:border-emerald-300"
            >
              <div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img
                  src={
                    item.imageUrl
                      ? getImageUrl(item.imageUrl)
                      : PROPERTY_PLACEHOLDER_IMAGE
                  }
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="line-clamp-1 text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.locationText || "Zimbabwe"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.bedrooms ?? "--"} bd | {item.bathrooms ?? "--"} ba |{" "}
                  {item.areaSqm ?? "--"} sqm
                </p>
                <p className="text-sm font-semibold text-emerald-600">
                  {item.currency} {Number(item.price ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.listingIntent === "TO_RENT" ? "To Rent" : "For Sale"} |
                  Trust {Math.round(Number(item.trustScore ?? 0))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {meta.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= meta.totalPages}
            onClick={() =>
              setPage((value) => Math.min(meta.totalPages, value + 1))
            }
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}
