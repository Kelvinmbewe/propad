import { Building2, MapPin } from "lucide-react";
import { getImageUrl } from "@/lib/image-url";
import { CompanyContactActions } from "@/components/company-profile/company-contact-actions";

export function CompanyHeroCard({
  companyId,
  company,
  activeListingsCount,
}: {
  companyId: string;
  company: any;
  activeListingsCount: number;
}) {
  const categories = Array.isArray(company.categories)
    ? company.categories
    : ([] as string[]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-muted">
            {company.logoUrl ? (
              <img
                src={getImageUrl(company.logoUrl)}
                alt={company.name}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Building2 className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {company.name}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  company.isVerified
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {company.isVerified ? "Verified" : "Unverified"}
              </span>
              {categories.map((category: string) => (
                <span
                  key={category}
                  className="rounded-full border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  {category}
                </span>
              ))}
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {company.city || "Zimbabwe"}
              {company.province ? `, ${company.province}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Active listings: {activeListingsCount}
            </p>
            <p className="text-sm text-muted-foreground">
              {company.shortDescription || company.description || ""}
            </p>
          </div>
        </div>

        <CompanyContactActions
          companyId={companyId}
          phone={company.phone}
          website={company.website || company.socialLinks?.website}
        />
      </div>
    </section>
  );
}
