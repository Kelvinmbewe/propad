import { LandingNav } from "@/components/landing-nav";
import { SiteFooter } from "@/components/site-footer";
import { AgenciesDiscoveryClient } from "@/app/agencies/_components/agencies-discovery-client";

export const dynamic = "force-dynamic";

export default function AgenciesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <AgenciesDiscoveryClient />
      <SiteFooter showFollow showVerificationLink />
    </div>
  );
}
