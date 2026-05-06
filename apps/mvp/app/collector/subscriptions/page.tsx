import { redirect } from "next/navigation";
import { getCollectorSubscriptions } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";
import { CollectorSubscriptionsClient } from "./collector-subscriptions-client";

export default async function CollectorSubscriptionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const subscriptions = await getCollectorSubscriptions(session.user.id);

  const formattedSubscriptions = subscriptions.map((sub) => ({
    ...sub,
    createdAt: sub.createdAt.toISOString(),
  }));

  return (
    <CollectorSubscriptionsClient
      initialSubscriptions={formattedSubscriptions}
    />
  );
}
