"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useMemo, useRef } from "react";
import { Button, Input, Label, Switch } from "@propad/ui";
import { LocateFixed, Search } from "lucide-react";
import type { QuickLocation } from "@/lib/homepage-locations";

export interface FloatingHeroCard {
  title: string;
  description: string;
  accent: string;
}

export interface HomeSearchState {
  intent: "FOR_SALE" | "TO_RENT";
  locationLabel: string;
  propertyType: string;
  priceRange: string;
  verifiedOnly: boolean;
}

interface LandingHeroProps {
  cards: FloatingHeroCard[];
  searchState: HomeSearchState;
  onSearchStateChange: (next: Partial<HomeSearchState>) => void;
  onSearch: () => void;
  onRequestLocation: () => void;
  onSelectQuickLocation: (location: QuickLocation) => void;
  quickLocations: QuickLocation[];
  locationSource: "browser" | "stored" | "manual" | "default";
  fallbackLabel: string;
  isLocating: boolean;
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

export function LandingHero({
  cards,
  searchState,
  onSearchStateChange,
  onSearch,
  onRequestLocation,
  onSelectQuickLocation,
  quickLocations,
  locationSource,
  fallbackLabel,
  isLocating,
}: LandingHeroProps) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });
  const helperLabel = useMemo(() => {
    if (locationSource === "browser") return "Using your live location";
    if (locationSource === "stored") return "Using saved location";
    if (locationSource === "manual") return "Location set manually";
    return `Defaulting to ${fallbackLabel}`;
  }, [fallbackLabel, locationSource]);

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden rounded-[40px] border border-white/10 bg-slate-900/40 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.85)]"
    >
      <Image
        src="https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1600&q=80"
        alt="Luxury penthouse with city skyline"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(0,150,136,0.7),rgba(43,108,176,0.85))]" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-16 pt-28 sm:px-12 lg:px-16">
        <div className="flex max-w-3xl flex-col gap-5 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#FF6F61,#9F7AEA)] px-4 py-2 text-xs uppercase tracking-[0.35em] text-white shadow-[0_0_10px_rgba(0,150,136,0.2)]">
            Property magnet for Zimbabwe
          </span>
          <h1 className="bg-[linear-gradient(135deg,#009688,#2B6CB0)] bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl lg:text-6xl">
            Find verified homes for sale and rent near you.
          </h1>
          <p className="max-w-2xl text-lg text-emerald-50/80 sm:text-xl">
            Personalized, trusted listings across Zimbabwe. Verified properties
            rise to the top, with transparent trust scoring.
          </p>
        </div>

        <form
          className="flex flex-col gap-4 rounded-[28px] border border-white/30 bg-white/15 p-4 backdrop-blur-[10px]"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 p-1">
              <button
                type="button"
                onClick={() => onSearchStateChange({ intent: "FOR_SALE" })}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
                  searchState.intent === "FOR_SALE"
                    ? "bg-white text-slate-900"
                    : "text-white/70 hover:text-white"
                }`}
              >
                For Sale
              </button>
              <button
                type="button"
                onClick={() => onSearchStateChange({ intent: "TO_RENT" })}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition ${
                  searchState.intent === "TO_RENT"
                    ? "bg-white text-slate-900"
                    : "text-white/70 hover:text-white"
                }`}
              >
                To Rent
              </button>
            </div>
            <label className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/80">
              Verified only
              <Switch
                checked={searchState.verifiedOnly}
                onCheckedChange={(checked) =>
                  onSearchStateChange({ verifiedOnly: checked })
                }
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="flex flex-col gap-1 rounded-2xl bg-white/10 px-4 py-3">
              <Label
                htmlFor="hero-location"
                className="text-[11px] uppercase tracking-widest text-white/70"
              >
                Location
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="hero-location"
                  value={searchState.locationLabel}
                  onChange={(event) =>
                    onSearchStateChange({ locationLabel: event.target.value })
                  }
                  placeholder="Near you"
                  className="h-9 flex-1 rounded-full border-none bg-transparent px-0 text-sm text-white placeholder:text-white/60 focus-visible:ring-[#009688]"
                />
                <button
                  type="button"
                  onClick={onRequestLocation}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white/80 transition hover:border-white hover:text-white"
                  aria-label="Use my location"
                >
                  <LocateFixed className="h-4 w-4" />
                </button>
              </div>
              <span className="text-[11px] text-white/60">
                {isLocating ? "Locating..." : helperLabel}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-white/10 px-4 py-3">
              <Label
                htmlFor="hero-type"
                className="text-[11px] uppercase tracking-widest text-white/70"
              >
                Property type
              </Label>
              <select
                id="hero-type"
                value={searchState.propertyType}
                onChange={(event) =>
                  onSearchStateChange({ propertyType: event.target.value })
                }
                className="h-9 w-full rounded-full border-none bg-transparent text-sm text-white outline-none focus:ring-2 focus:ring-[#009688]"
              >
                {propertyTypes.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                    className="text-slate-900"
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-white/10 px-4 py-3">
              <Label
                htmlFor="hero-budget"
                className="text-[11px] uppercase tracking-widest text-white/70"
              >
                Price range
              </Label>
              <select
                id="hero-budget"
                value={searchState.priceRange}
                onChange={(event) =>
                  onSearchStateChange({ priceRange: event.target.value })
                }
                className="h-9 w-full rounded-full border-none bg-transparent text-sm text-white outline-none focus:ring-2 focus:ring-[#009688]"
              >
                {priceRanges.map((range) => (
                  <option
                    key={range.value}
                    value={range.value}
                    className="text-slate-900"
                  >
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              className="h-full rounded-full border-2 border-[#2EFEA5] bg-[linear-gradient(135deg,#009688,#2B6CB0)] px-8 text-base font-semibold text-white shadow-[0_18px_42px_-18px_rgba(0,150,136,0.65)] transition hover:shadow-[0_20px_48px_-18px_rgba(43,108,176,0.65)]"
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickLocations.map((location) => (
              <button
                key={location.label}
                type="button"
                onClick={() => onSelectQuickLocation(location)}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40 hover:text-white"
              >
                {location.label}
              </button>
            ))}
          </div>
        </form>

        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <FloatingHeroCardItem
              key={card.title}
              card={card}
              index={index}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FloatingHeroCardItem({
  card,
  index,
  progress,
}: {
  card: FloatingHeroCard;
  index: number;
  progress: MotionValue<number>;
}) {
  const y = useTransform(progress, (value) => -value * (80 + index * 20));

  return (
    <motion.div
      style={{ y }}
      className="rounded-3xl border border-white/10 bg-white/20 p-6 text-white shadow-[0_0_10px_rgba(0,150,136,0.2)] backdrop-blur-[10px]"
    >
      <span className="text-xs font-medium uppercase tracking-[0.4em] text-white/60">
        {card.accent}
      </span>
      <h3 className="mt-3 text-xl font-semibold">{card.title}</h3>
      <p className="mt-2 text-sm text-white/75">{card.description}</p>
    </motion.div>
  );
}
