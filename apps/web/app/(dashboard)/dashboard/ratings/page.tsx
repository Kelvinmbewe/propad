import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { serverApiRequest } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type RatingItem = {
  id: string;
  context: string;
  targetType: string;
  targetId: string;
  score: number;
  comment: string | null;
  createdAt: string;
  leaseId: string | null;
  propertyId: string | null;
  rater: { id: string; name: string | null; email: string | null };
  property?: { id: string; title: string } | null;
};

type RatingsResponse = {
  items: RatingItem[];
  aggregate: { total: number; average: number };
};

async function getRatings(): Promise<RatingsResponse> {
  try {
    return await serverApiRequest<RatingsResponse>("/rental-v2/ratings");
  } catch (error) {
    console.error("Failed to fetch ratings", error);
    return { items: [], aggregate: { total: 0, average: 0 } };
  }
}

export default async function RatingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const data = await getRatings();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ratings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Reputation insights from completed rental cycles.
        </p>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <span className="text-slate-500">Average score:</span>{" "}
            <span className="font-semibold text-slate-900">{data.aggregate.average.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500">Total ratings:</span>{" "}
            <span className="font-semibold text-slate-900">{data.aggregate.total}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {data.items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No ratings yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((item) => (
              <li key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.rater.name || item.rater.email || "Unknown rater"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.context} • {item.targetType}
                      {item.property ? (
                        <>
                          {" "}•{" "}
                          <Link
                            href={`/dashboard/listings/${item.property.id}`}
                            className="text-emerald-700 hover:underline"
                          >
                            {item.property.title}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    {item.comment ? (
                      <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {item.comment}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900">
                    {item.score}/5
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
