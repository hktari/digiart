import { redirect } from "next/navigation";
import { CreatorSetupForm } from "@/components/creator-setup-form";
import { getCreatorProfile } from "@/lib/actions/creator";
import { auth } from "@/lib/auth";

export default async function CreatorSetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const profile = await getCreatorProfile(session.user.id);

  if (profile && profile.status === "PUBLISHED") {
    redirect("/");
  }

  return (
    <CreatorSetupForm
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
