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
  searchParams?: Promise<{ ref?: string }>;
};

export default async function CreatorSubscribePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const referralCode = resolvedSearchParams.ref ?? undefined;
  const session = await auth();

  if (!session?.user?.id) {
    const callbackUrl = referralCode
      ? `/creators/${slug}/subscribe?ref=${referralCode}`
      : `/creators/${slug}/subscribe`;
    redirect(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const profile = await getPublicCreatorProfile(slug);

  if (!profile) {
    notFound();
  }

  await ensureRole(session.user.id, "COLLECTOR");

  const collectorProfile = await getCollectorProfile(session.user.id);

  if (!collectorProfile) {
    const setupParams = new URLSearchParams({ creator: profile.id });
    if (referralCode) setupParams.set("ref", referralCode);
    redirect(`/collector/setup?${setupParams.toString()}`);
  }

  if (collectorProfile.onboardingState === "PENDING") {
    const setupParams = new URLSearchParams({ creator: profile.id });
    if (referralCode) setupParams.set("ref", referralCode);
    redirect(`/collector/setup?${setupParams.toString()}`);
  }

  const result = await subscribeToCreator(profile.id, undefined, {
    revalidate: false,
    referralCode,
  });
  if (!result.success) {
    redirect(
      `/creators/${slug}?subscriptionError=${encodeURIComponent(result.error ?? "Unable to subscribe")}`,
    );
  }

  const redirectParams = new URLSearchParams();
  redirectParams.set("subscribed", "1");
  if (result.autoAssignedReleaseTitle) {
    redirectParams.set("autoAddedRelease", result.autoAssignedReleaseTitle);
  }
  if (result.autoAssignmentSkipped) {
    redirectParams.set("autoAddSkipped", "1");
  }

  redirect(`/creators/${slug}?${redirectParams.toString()}`);
}
