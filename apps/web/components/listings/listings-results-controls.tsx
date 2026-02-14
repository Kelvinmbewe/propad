"use client";

import { Button } from "@propad/ui";
import type {
  ListingsCardView,
  ListingsSort,
  ListingsViewMode,
} from "@/lib/listings";

const sortOptions: Array<{ value: ListingsSort; label: string }> = [
  { value: "RECOMMENDED", label: "Recommended" },
  { value: "NEWEST", label: "Newest" },
  { value: "PRICE_ASC", label: "Price: low to high" },
  { value: "PRICE_DESC", label: "Price: high to low" },
  { value: "TRUST_DESC", label: "Highest trust" },
];

export function ListingsResultsControls({
  sort,
  viewMode,
  cardView,
  page,
  totalPages,
  total,
  onSortChange,
  onViewModeChange,
  onCardViewChange,
  onPageChange,
}: {
  sort: ListingsSort;
  viewMode: ListingsViewMode;
  cardView: ListingsCardView;
  page: number;
  totalPages: number;
  total: number;
  onSortChange: (next: ListingsSort) => void;
  onViewModeChange: (next: ListingsViewMode) => void;
  onCardViewChange: (next: ListingsCardView) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        Sort
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ListingsSort)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2"
          aria-label="Sort listings"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {(["list", "map", "split"] as ListingsViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${
              viewMode === mode
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
            aria-label={`Switch to ${mode} view`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {(["grid", "list"] as ListingsCardView[]).map((layout) => (
          <button
            key={layout}
            type="button"
            onClick={() => onCardViewChange(layout)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${
              cardView === layout
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
            aria-label={`Switch to ${layout} cards`}
          >
            {layout}
          </button>
        ))}
      </div>

      <span className="ml-auto text-sm text-slate-600">
        {total.toLocaleString()} results
      </span>

      <div className="inline-flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= Math.max(1, totalPages)}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  );
}
