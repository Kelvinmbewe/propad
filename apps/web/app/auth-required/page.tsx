import { AuthRequiredClient } from "./client";

export const dynamic = "force-dynamic";

export default function AuthRequiredPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const returnToParam = searchParams.returnTo;
  const upgradeTokenParam = searchParams.upgradeToken;
  const authOpenParam = searchParams.authOpen;

  const returnTo =
    typeof returnToParam === "string" && returnToParam
      ? returnToParam
      : "/dashboard";
  const upgradeToken =
    typeof upgradeTokenParam === "string" && upgradeTokenParam
      ? upgradeTokenParam
      : undefined;
  const authOpen = authOpenParam === "1";

  return (
    <AuthRequiredClient
      returnTo={returnTo}
      upgradeToken={upgradeToken}
      authOpen={authOpen}
    />
  );
}
