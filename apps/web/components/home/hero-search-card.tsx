"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button, Input, Label, Switch } from "@propad/ui";
import {
  ChevronDown,
  LocateFixed,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { QuickLocation } from "@/lib/homepage-locations";
import { useLocationSearch } from "@/hooks/use-location-search";

export interface HomeSearchState {
  intent: "FOR_SALE" | "TO_RENT";
  locationLabel: string;
  locationId?: string | null;
  locationLevel?: string | null;
  propertyType: string;
  priceRange: string;
  verifiedOnly: boolean;
  minTrust: number;
}

interface HeroSearchCardProps {
  searchState: HomeSearchState;
  onSearchStateChange: (next: Partial<HomeSearchState>) => void;
  onSearch: () => void;
  onRequestLocation: () => void;
  onSelectQuickLocation: (location: QuickLocation) => void;
  onCreateAlert: () => void;
  quickLocations: QuickLocation[];
  locationSource: "browser" | "stored" | "manual" | "default";
  fallbackLabel: string;
  isLocating: boolean;
  isAuthenticated: boolean;
}

const priceRanges = [
  { value: "any", label: "Any price" },
  { value: "0-500", label: "Up to US$500" },
  { value: "500-1000", label: "US$500 - 1,000" },
  { value: "1000-2000", label: "US$1,000 - 2,000" },
  { value: "2000-5000", label: "US$2,000 - 5,000" },
  { value: "5000+", label: "Above US$5,000" },
];

const propertyTypes = [
  { value: "any", label: "Any type" },
  { value: "HOUSE", label: "House" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "COMMERCIAL_OFFICE", label: "Commercial" },
  { value: "LAND", label: "Land" },
];

export function HeroSearchCard({
  searchState,
  onSearchStateChange,
  onSearch,
  onRequestLocation,
  onSelectQuickLocation,
  onCreateAlert,
  quickLocations,
  locationSource,
  fallbackLabel,
  isLocating,
  isAuthenticated,
}: HeroSearchCardProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const helperLabel = useMemo(() => {
    if (locationSource === "browser") return "Using your live location";
    if (locationSource === "stored") return "Using saved location";
    if (locationSource === "manual") return "Location set manually";
    return `Defaulting to ${fallbackLabel}`;
  }, [fallbackLabel, locationSource]);
  const { data: locationResults } = useLocationSearch(
    searchState.locationLabel,
  );
  const suggestions = (locationResults?.items ?? []).slice(0, 6);

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-slate-950">
      <Image
        src="https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1800&q=80"
        alt="Zimbabwe properties"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,32,40,0.68),rgba(8,24,44,0.62))]" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-24 text-white sm:px-10 lg:px-16">
        <div className="flex flex-col gap-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">
            PropAd Zimbabwe · Verified homes
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Find verified homes to buy or rent, faster.
          </h1>
          <p className="mx-auto max-w-2xl text-base text-emerald-100/80 sm:text-lg">
            Search across Zimbabwe with trust-first rankings, geo-personalized
            results, and verified agents.
          </p>
        </div>

        <form
          className="mx-auto w-full max-w-4xl rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-[0_30px_80px_-50px_rgba(15,23,42,0.85)]"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
            <button
              type="button"
              onClick={() => onSearchStateChange({ intent: "FOR_SALE" })}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                searchState.intent === "FOR_SALE"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              For Sale
            </button>
            <button
              type="button"
              onClick={() => onSearchStateChange({ intent: "TO_RENT" })}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                searchState.intent === "TO_RENT"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              To Rent
            </button>
            <span className="ml-auto text-xs uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
              Verified-only
            </span>
            <Switch
              checked={searchState.verifiedOnly}
              onCheckedChange={(checked) =>
                onSearchStateChange({ verifiedOnly: checked })
              }
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr_auto]">
            <div className="rounded-2xl border border-border px-4 py-3">
              <Label
                htmlFor="hero-location"
                className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground"
              >
                City, suburb, or town
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="hero-location"
                  value={searchState.locationLabel}
                  onChange={(event) =>
                    onSearchStateChange({
                      locationLabel: event.target.value,
                      locationId: null,
                      locationLevel: null,
                    })
                  }
                  placeholder="Start typing..."
                  className="h-10 border-none bg-transparent px-0 text-base text-foreground shadow-none focus-visible:ring-0"
                />
                <button
                  type="button"
                  onClick={onRequestLocation}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-300"
                  aria-label="Use my location"
                >
                  <LocateFixed className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isLocating ? "Locating..." : helperLabel}
              </p>
              {suggestions.length > 0 && !searchState.locationId ? (
                <div className="mt-3 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-sm">
                  {suggestions.map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onSearchStateChange({
                          locationLabel: item.name,
                          locationId: item.id,
                          locationLevel: item.level,
                        })
                      }
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground hover:bg-emerald-50 dark:hover:bg-emerald-500/20"
                    >
                      <span>{item.name}</span>
                      <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        {item.level}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="flex h-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-300"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                More filters
              </span>
              <ChevronDown
                className={`h-4 w-4 transition ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>

            <Button
              type="submit"
              className="h-full rounded-2xl bg-emerald-600 px-8 text-base font-semibold text-white shadow-[0_20px_60px_-30px_rgba(16,185,129,0.85)] transition hover:bg-emerald-500"
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>

          {filtersOpen ? (
            <div className="mt-5 grid gap-4 rounded-2xl bg-muted p-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Property type
                </span>
                <select
                  value={searchState.propertyType}
                  onChange={(event) =>
                    onSearchStateChange({ propertyType: event.target.value })
                  }
                  className="h-10 rounded-xl border border-input bg-background px-3 text-foreground"
                >
                  {propertyTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Price range
                </span>
                <select
                  value={searchState.priceRange}
                  onChange={(event) =>
                    onSearchStateChange({ priceRange: event.target.value })
                  }
                  className="h-10 rounded-xl border border-input bg-background px-3 text-foreground"
                >
                  {priceRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-full flex flex-col gap-2 text-sm text-muted-foreground">
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Minimum trust score: {searchState.minTrust}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={searchState.minTrust}
                  onChange={(event) =>
                    onSearchStateChange({
                      minTrust: Number(event.target.value),
                    })
                  }
                  className="accent-emerald-600"
                />
              </label>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {quickLocations.map((location) => (
                <button
                  key={location.label}
                  type="button"
                  onClick={() => onSelectQuickLocation(location)}
                  className="rounded-full border border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground transition hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-300"
                >
                  {location.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onCreateAlert}
              className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600 hover:text-emerald-500 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              {isAuthenticated
                ? "Create alert for this search"
                : "Sign in to create alert"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
