import { notFound, redirect } from "next/navigation";
import {
  getCollectorProfile,
  subscribeToCreator,
} from "@/lib/actions/collector";
import { getPublicCreatorProfile } from "@/lib/actions/creator";
import { ensureRole } from "@/lib/actions/roles";
import { auth } from "@/lib/auth";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CreatorSubscribePage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/auth/sign-in?callbackUrl=/creators/${slug}/subscribe`);
  }

  const profile = await getPublicCreatorProfile(slug);

  if (!profile) {
    notFound();
  }

  await ensureRole(session.user.id, "COLLECTOR");

  const collectorProfile = await getCollectorProfile(session.user.id);

  if (!collectorProfile) {
    redirect(`/collector/setup?creator=${profile.id}`);
  }

  if (collectorProfile.onboardingState === "PENDING") {
    redirect(`/collector/setup?creator=${profile.id}`);
  }

  await subscribeToCreator(profile.id);

  redirect("/collector/subscriptions");
}
