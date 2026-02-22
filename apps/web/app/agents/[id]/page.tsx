import { redirect } from "next/navigation";

export default function LegacyAgentProfileRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/profiles/users/${params.id}`);
}
