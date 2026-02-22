import Link from "next/link";
import { User } from "lucide-react";
import { getImageUrl } from "@/lib/image-url";

export function TeamPreview({
  companyId,
  members,
}: {
  companyId: string;
  members: Array<{
    id: string;
    name: string;
    profilePhoto?: string | null;
    activeListingsCount?: number;
    trustScore?: number | null;
  }>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Agents in this agency
        </h3>
        <Link
          href={`/profiles/companies/${companyId}?tab=team`}
          className="text-xs font-medium text-emerald-600"
        >
          View all agents
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {members.length ? (
          members.map((member) => (
            <Link
              key={member.id}
              href={`/profiles/users/${member.id}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 hover:border-emerald-300"
            >
              <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
                {member.profilePhoto ? (
                  <img
                    src={getImageUrl(member.profilePhoto)}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.activeListingsCount ?? 0} active listings
                </p>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No agent team published yet.
          </p>
        )}
      </div>
    </section>
  );
}
