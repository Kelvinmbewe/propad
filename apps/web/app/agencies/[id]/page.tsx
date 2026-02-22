import { redirect } from "next/navigation";

export default function LegacyAgencyProfileRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/profiles/companies/${params.id}`);
}
