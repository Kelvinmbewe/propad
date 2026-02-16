import Link from "next/link";
import { getImageUrl } from "@/lib/image-url";

export function AgencyAffiliationCard({ affiliation }: { affiliation: any }) {
  if (!affiliation?.agencyId) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Agency affiliation
      </h3>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-lg bg-muted">
          {affiliation.logoUrl ? (
            <img
              src={getImageUrl(affiliation.logoUrl)}
              alt={affiliation.name}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {affiliation.name}
          </p>
          <Link
            href={`/profiles/companies/${affiliation.agencyId}`}
            className="text-xs text-emerald-600 hover:text-emerald-500"
          >
            View agency
          </Link>
        </div>
      </div>
    </section>
  );
}
