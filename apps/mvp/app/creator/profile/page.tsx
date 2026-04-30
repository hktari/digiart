import Link from "next/link";
import { redirect } from "next/navigation";
import { AvatarUpload } from "@/components/avatar-upload";
import { PayoutForm } from "@/components/payout-form";
import { SocialLinksForm } from "@/components/social-links-form";
import { getCreatorProfile } from "@/lib/actions/creator";
import { getSocialLinks } from "@/lib/actions/social-links";
import { auth } from "@/lib/auth";

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
        <Link
          href="/account"
          className="text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:text-neutral-600"
        >
          Workspace
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-6">
          Profile and payouts
        </h1>
        <AvatarUpload
          currentAvatar={profile.avatar}
          displayName={profile.displayName}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-4">
          Payout
        </h2>
        <PayoutForm
          initialData={{
            legalName: profile.payoutProfile?.legalName,
            taxId: profile.payoutProfile?.taxId,
            paypalEmail: profile.payoutProfile?.paypalEmail,
            isReady: profile.payoutProfile?.isReady,
          }}
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
