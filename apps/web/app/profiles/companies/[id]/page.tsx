import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Users,
  Star,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getImageUrl } from "@/lib/image-url";
import { getPublicApiBaseUrl } from "@/lib/api-base-url";
import { CompanyKycActions } from "@/components/company-kyc-actions";

type SearchParams = { tab?: string };

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "listings", label: "Listings" },
  { key: "reviews", label: "Reviews" },
  { key: "team", label: "Team" },
  { key: "trust", label: "Trust & Compliance" },
];

async function getCompanySummary(id: string) {
  const candidates = [
    getPublicApiBaseUrl(),
    "http://localhost:3001/v1",
    "http://127.0.0.1:3001/v1",
    "http://host.docker.internal:3001/v1",
  ].filter((value): value is string => Boolean(value));

  for (const apiBaseUrl of candidates) {
    try {
      const res = await fetch(`${apiBaseUrl}/companies/${id}/summary`, {
        cache: "no-store",
      });
      if (!res.ok) continue;
      return res.json();
    } catch (error) {
      continue;
    }
  }

  return null;
}

async function getAdminCompanyKyc(id: string) {
  const session = await auth();
  const token = session?.accessToken as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;
  const canView = role && ["ADMIN", "VERIFIER", "MODERATOR"].includes(role);
  if (!token || !canView) return null;

  const candidates = [
    getPublicApiBaseUrl(),
    "http://localhost:3001/v1",
    "http://127.0.0.1:3001/v1",
    "http://host.docker.internal:3001/v1",
  ].filter((value): value is string => Boolean(value));

  for (const apiBaseUrl of candidates) {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/companies/${id}/kyc`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) continue;
      return res.json();
    } catch (error) {
      continue;
    }
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const profile = await getCompanySummary(params.id);
  if (!profile) return { title: "Company Not Found | ProPad" };
  return {
    title: `${profile.name} - Verified Real Estate Agency | ProPad`,
    description:
      profile.shortDescription ||
      profile.description ||
      `View properties and agents from ${profile.name}.`,
  };
}

export default async function CompanyProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const company = await getCompanySummary(params.id);
  if (!company) return notFound();

  const adminKyc = await getAdminCompanyKyc(params.id);
  const activeTab = searchParams.tab ?? "overview";
  const trustBreakdown = (company.trust?.breakdown ?? {}) as Record<
    string,
    number
  >;
  const tabItems = adminKyc
    ? [...tabs, { key: "kyc", label: "KYC (Admin only)" }]
    : tabs;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="container mx-auto max-w-6xl px-4 space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-slate-900 to-slate-800 relative">
            {company.coverUrl && (
              <img
                src={getImageUrl(company.coverUrl)}
                alt={company.name}
                className="h-full w-full object-cover opacity-70"
              />
            )}
          </div>
          <div className="px-10 pb-10">
            <div className="-mt-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <div className="h-24 w-24 rounded-2xl border-4 border-white bg-white shadow-lg flex items-center justify-center overflow-hidden">
                  {company.logoUrl ? (
                    <img
                      src={getImageUrl(company.logoUrl)}
                      alt={company.name}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    {company.name}
                    {company.trust?.score >= 80 && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1">
                        Verified Agency
                      </span>
                    )}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" /> Real Estate Agency
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" /> {company.team?.length ?? 0}{" "}
                      Agents
                    </span>
                    {company.stats?.yearsActive ? (
                      <span>
                        Since{" "}
                        {new Date().getFullYear() - company.stats.yearsActive}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  Browse Listings
                </button>
                <button className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Contact
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500 uppercase">Listings</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {company.stats?.listingsCount ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500 uppercase">Reviews</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {company.stats?.reviewsCount ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500 uppercase">Rating</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {company.stats?.avgRating ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500 uppercase">
                  Trust Score
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {company.trust?.score ?? 0} / 100
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabItems.map((tab) => (
            <Link
              key={tab.key}
              href={`/profiles/companies/${params.id}?tab=${tab.key}`}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900">About</h3>
                <p className="mt-3 text-sm text-slate-600">
                  {company.description ||
                    company.shortDescription ||
                    "No description provided."}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  Services
                </h3>
                <p className="mt-3 text-sm text-slate-600">
                  {company.services?.items?.join?.(", ") ||
                    company.services ||
                    "Not provided"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  Areas served
                </h3>
                <p className="mt-3 text-sm text-slate-600">
                  {company.areasServed?.join?.(", ") || "Not provided"}
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900">Hours</h3>
                <p className="mt-3 text-sm text-slate-600">
                  {company.hours?.weekday || "Not provided"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  Languages
                </h3>
                <p className="mt-3 text-sm text-slate-600">
                  {company.languages?.join?.(", ") || "Not provided"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900">Social</h3>
                <p className="mt-3 text-sm text-slate-600">
                  {company.socialLinks?.website || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "listings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Listings</h2>
              <button className="text-sm font-medium text-emerald-700">
                View all
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(company.listings ?? []).map((listing: any) => (
                <div
                  key={listing.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="aspect-[4/3] w-full rounded-lg bg-slate-100 overflow-hidden">
                    {listing.imageUrl ? (
                      <img
                        src={getImageUrl(listing.imageUrl)}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900">
                    {listing.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {listing.suburb || listing.city || "Location"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {listing.currency} {listing.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Average rating</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {company.stats?.avgRating ?? 0}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4" />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-4">
              {(company.reviews ?? []).map((review: any) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {review.author}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="text-xs text-red-500">Report</button>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "team" && (
          <div className="grid gap-4 md:grid-cols-4">
            {(company.team ?? []).map((agent: any) => (
              <Link
                key={agent.id}
                href={`/profiles/users/${agent.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="h-32 w-full rounded-lg bg-slate-100 overflow-hidden">
                  {agent.profilePhoto ? (
                    <img
                      src={getImageUrl(agent.profilePhoto)}
                      alt={agent.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <Users className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <p className="mt-3 font-semibold text-slate-900">
                  {agent.name}
                </p>
                <p className="text-xs text-slate-500">View profile</p>
              </Link>
            ))}
          </div>
        )}

        {activeTab === "trust" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Trust score
              </h3>
              <p className="mt-2 text-4xl font-bold text-slate-900">
                {company.trust?.score ?? 0} / 100
              </p>
              <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${company.trust?.score ?? 0}%` }}
                ></div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Based on verified documents, transactions, and customer
                feedback.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Breakdown
              </h3>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {Object.entries(trustBreakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="capitalize">{key}</span>
                    <span className="font-semibold text-slate-900">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
                Complaints resolved:{" "}
                {Math.round(
                  (company.trust?.explanation?.complaintResolutionRate ?? 0) *
                    100,
                )}
                %
              </div>
            </div>
          </div>
        )}

        {activeTab === "kyc" && adminKyc && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                KYC Snapshot
              </h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-600">
                <div>
                  <p className="text-slate-500">Legal name</p>
                  <p className="font-semibold text-slate-900">
                    {adminKyc.kyc?.identity?.legalName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Registration number</p>
                  <p className="font-semibold text-slate-900">
                    {adminKyc.kyc?.identity?.registrationNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Tax number</p>
                  <p className="font-semibold text-slate-900">
                    {adminKyc.kyc?.identity?.taxNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Address</p>
                  <p className="font-semibold text-slate-900">
                    {[
                      adminKyc.kyc?.identity?.addressLine1,
                      adminKyc.kyc?.identity?.addressCity,
                      adminKyc.kyc?.identity?.addressProvince,
                      adminKyc.kyc?.identity?.addressCountry,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Documents
              </h3>
              <div className="mt-4 space-y-3">
                {(adminKyc.kyc?.documents ?? []).map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <FileText className="h-4 w-4" />
                      {doc.type}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {doc.status}
                      </span>
                      <a
                        href={doc.signedUrl}
                        className="text-xs text-emerald-700"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                KYC Actions
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Approve, reject, or request updated documentation.
              </p>
              <div className="mt-4">
                <CompanyKycActions
                  companyId={params.id}
                  documents={(adminKyc.kyc?.documents ?? []).map(
                    (doc: any) => ({
                      id: doc.id,
                      status: doc.status,
                    }),
                  )}
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Audit Log
              </h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {(adminKyc.auditLogs ?? []).map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between border-b border-slate-100 pb-2"
                  >
                    <span>{log.action}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
