"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
} from "@propad/ui";
import { LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import { useLocationSearch } from "@/hooks/use-location-search";
import type { ListingsIntent, ListingsQueryState } from "@/lib/listings";

interface LocationSuggestion {
  id: string;
  name: string;
  level: string;
  lat?: number | null;
  lng?: number | null;
}

const propertyTypeOptions = [
  { value: "", label: "Any type" },
  { value: "HOUSE", label: "House" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "COMMERCIAL_OFFICE", label: "Commercial" },
  { value: "LAND", label: "Land" },
];

const bedOptions = [
  { value: "", label: "Any beds" },
  { value: "1", label: "1+ beds" },
  { value: "2", label: "2+ beds" },
  { value: "3", label: "3+ beds" },
  { value: "4", label: "4+ beds" },
  { value: "5", label: "5+ beds" },
];

export function ListingsSearchModule({
  draft,
  intent,
  onIntentChange,
  onDraftChange,
  onUseNearMe,
  onSearch,
}: {
  draft: ListingsQueryState;
  intent: ListingsIntent;
  onIntentChange: (intent: ListingsIntent) => void;
  onDraftChange: (next: Partial<ListingsQueryState>) => void;
  onUseNearMe: () => void;
  onSearch: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { data } = useLocationSearch(draft.q);
  const suggestions = useMemo(
    () => ((data?.items ?? []) as LocationSuggestion[]).slice(0, 6),
    [data?.items],
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => onIntentChange("FOR_SALE")}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${
            intent === "FOR_SALE"
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          For Sale
        </button>
        <button
          type="button"
          onClick={() => onIntentChange("TO_RENT")}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${
            intent === "TO_RENT"
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          To Rent
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.7fr_repeat(4,minmax(0,1fr))_auto]">
        <div className="rounded-2xl border border-slate-200 px-3 py-2">
          <Label
            htmlFor="listings-location"
            className="text-[11px] uppercase tracking-[0.2em] text-slate-400"
          >
            City, suburb, or town
          </Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              id="listings-location"
              value={draft.q}
              onChange={(event) =>
                onDraftChange({
                  q: event.target.value,
                  locationId: undefined,
                  locationLevel: undefined,
                })
              }
              className="border-0 px-0 shadow-none focus-visible:ring-0"
              placeholder="Harare, Borrowdale, Bulawayo"
              aria-label="Search by location"
            />
            <button
              type="button"
              onClick={onUseNearMe}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-emerald-200 hover:text-emerald-600"
              aria-label="Use my location"
            >
              <LocateFixed className="h-4 w-4" />
            </button>
          </div>
          {suggestions.length > 0 && !draft.locationId ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-1">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onDraftChange({
                      q: item.name,
                      locationId: item.id,
                      locationLevel: item.level,
                      lat: typeof item.lat === "number" ? item.lat : undefined,
                      lng: typeof item.lng === "number" ? item.lng : undefined,
                    })
                  }
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-emerald-50"
                >
                  <span>{item.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    {item.level}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <label className="flex flex-col gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
          <span className="uppercase tracking-[0.2em]">Type</span>
          <select
            value={draft.type ?? ""}
            onChange={(event) =>
              onDraftChange({ type: event.target.value || undefined })
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
            aria-label="Property type"
          >
            {propertyTypeOptions.map((option) => (
              <option key={option.value || "any"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
          <span className="uppercase tracking-[0.2em]">Min price</span>
          <Input
            type="number"
            min={0}
            value={draft.priceMin ?? ""}
            onChange={(event) =>
              onDraftChange({
                priceMin: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            className="h-8 border-slate-200 text-sm"
            placeholder="Any"
            aria-label="Minimum price"
          />
        </label>

        <label className="flex flex-col gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
          <span className="uppercase tracking-[0.2em]">Max price</span>
          <Input
            type="number"
            min={0}
            value={draft.priceMax ?? ""}
            onChange={(event) =>
              onDraftChange({
                priceMax: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            className="h-8 border-slate-200 text-sm"
            placeholder="Any"
            aria-label="Maximum price"
          />
        </label>

        <label className="flex flex-col gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
          <span className="uppercase tracking-[0.2em]">Beds</span>
          <select
            value={draft.bedrooms ? String(draft.bedrooms) : ""}
            onChange={(event) =>
              onDraftChange({
                bedrooms: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
            aria-label="Bedrooms"
          >
            {bedOptions.map((option) => (
              <option key={option.value || "any"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Button
          onClick={onSearch}
          className="h-full min-h-12 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500"
          aria-label="Search listings"
        >
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
          Verified only
          <Switch
            checked={draft.verifiedOnly}
            onCheckedChange={(checked) =>
              onDraftChange({ verifiedOnly: checked })
            }
            aria-label="Verified only listings"
          />
        </label>

        <Button
          type="button"
          variant="secondary"
          className="rounded-full"
          onClick={() => setMoreOpen(true)}
          aria-label="More filters"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          More filters
        </Button>
      </div>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Advanced filters</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span>Minimum trust score: {draft.minTrust}</span>
              <input
                type="range"
                min={0}
                max={110}
                step={5}
                value={draft.minTrust}
                onChange={(event) =>
                  onDraftChange({ minTrust: Number(event.target.value) })
                }
                className="accent-emerald-600"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span>Radius</span>
              <select
                value={String(draft.radiusKm)}
                onChange={(event) =>
                  onDraftChange({
                    radiusKm: Number(event.target.value) as 150 | 300 | 500,
                  })
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3"
              >
                <option value="150">150 km</option>
                <option value="300">300 km</option>
                <option value="500">500 km</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setMoreOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
