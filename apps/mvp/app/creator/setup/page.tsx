import { redirect } from "next/navigation";
import { CreatorSetupForm } from "@/components/creator-setup-form";
import { getCreatorArtworkCount } from "@/lib/actions/artworks";
import { getCreatorProfile } from "@/lib/actions/creator";
import { auth } from "@/lib/auth";

export default async function CreatorSetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const [profile, artworkCount] = await Promise.all([
    getCreatorProfile(session.user.id),
    getCreatorArtworkCount(),
  ]);

  if (profile?.onboardingComplete) {
    redirect("/");
  }

  return (
    <CreatorSetupForm
      initialArtworkCount={artworkCount}
      initialData={
        profile
          ? {
              displayName: profile.displayName,
              slug: profile.slug,
              bio: profile.bio ?? undefined,
              sourcePlatforms: profile.sourcePlatform?.split(",") ?? undefined,
              paypalEmail: profile.payoutProfile?.paypalEmail ?? undefined,
              avatar: profile.avatar ?? undefined,
            }
          : undefined
      }
    />
  );
}
