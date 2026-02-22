"use client";

import { Button } from "@propad/ui";

export function SavedSearchCTA({
  location,
  isAuthenticated,
  isSaving,
  onCreate,
}: {
  location: string;
  isAuthenticated: boolean;
  isSaving: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
            Saved search
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">
            Get alerts for properties in {location}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {isAuthenticated
              ? "Save this search and get notified when matching properties are published."
              : "Sign in to create alerts and track new verified listings."}
          </p>
        </div>
        <Button
          onClick={onCreate}
          disabled={isSaving}
          className="rounded-full bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {isAuthenticated ? "Create alert" : "Sign in to create alerts"}
        </Button>
      </div>
    </section>
  );
}
