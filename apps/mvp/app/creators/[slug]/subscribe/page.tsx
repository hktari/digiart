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

  const result = await subscribeToCreator(profile.id, undefined, {
    revalidate: false,
  });
  if (!result.success) {
    redirect(
      `/creators/${slug}?subscriptionError=${encodeURIComponent(result.error ?? "Unable to subscribe")}`,
    );
  }

  const searchParams = new URLSearchParams();
  searchParams.set("subscribed", "1");
  if (result.autoAssignedReleaseTitle) {
    searchParams.set("autoAddedRelease", result.autoAssignedReleaseTitle);
  }
  if (result.autoAssignmentSkipped) {
    searchParams.set("autoAddSkipped", "1");
  }

  redirect(`/creators/${slug}?${searchParams.toString()}`);
}
