"use client";

import { Button } from "@propad/ui";

interface SavedSearchCTASectionProps {
  isAuthenticated: boolean;
  onCreateAlert: () => void;
}

export function SavedSearchCTASection({
  isAuthenticated,
  onCreateAlert,
}: SavedSearchCTASectionProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
      <div className="flex flex-col gap-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-[0.35em] text-emerald-500">
            Saved searches
          </span>
          <h3 className="text-2xl font-semibold text-slate-900">
            Get alerts for verified homes near you.
          </h3>
          <p className="max-w-xl text-sm text-slate-600">
            Save your search and we will notify you when new trusted listings
            match your filters.
          </p>
        </div>
        <Button
          onClick={onCreateAlert}
          className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-500"
        >
          {isAuthenticated ? "Create alert" : "Sign in to create alerts"}
        </Button>
      </div>
    </section>
  );
}
