import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AvatarUpload } from "@/components/avatar-upload";
import { SocialLinksForm } from "@/components/social-links-form";
import { getSocialLinks } from "@/lib/actions/social-links";
import { getCreatorProfile } from "@/lib/actions/creator";

export default async function CreatorProfileEditPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const profile = await getCreatorProfile(session.user.id);

  if (!profile) {
    redirect("/creator/setup");
  }

  const socialLinks = await getSocialLinks();

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-6">
          Edit profile
        </h1>
        <AvatarUpload
          currentAvatar={profile.avatar}
          displayName={profile.displayName}
        />
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-4">
          Social links
        </h2>
        <SocialLinksForm initialLinks={socialLinks} />
      </div>
    </div>
  );
}
