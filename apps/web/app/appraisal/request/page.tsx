import { LandingNav } from "@/components/landing-nav";
import { SiteFooter } from "@/components/site-footer";
import { serverPublicApiRequest } from "@/lib/server-api";
import { AppraisalRequestForm } from "@/app/appraisal/request/request-form";

export const dynamic = "force-dynamic";

export default async function AppraisalRequestPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const companyIdRaw = searchParams.companyId;
  const companyId = Array.isArray(companyIdRaw)
    ? companyIdRaw[companyIdRaw.length - 1]
    : companyIdRaw;

  const company = companyId
    ? await serverPublicApiRequest<any>(`/companies/${companyId}`).catch(
        () => null,
      )
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-card p-6 text-card-foreground">
          <h1 className="text-2xl font-semibold text-foreground">
            Request a market appraisal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Send your appraisal request directly to a trusted agency through
            PropAd Messenger.
          </p>
          <AppraisalRequestForm company={company} companyId={companyId ?? ""} />
        </section>
      </main>
      <SiteFooter showFollow showVerificationLink={false} />
    </div>
  );
}
