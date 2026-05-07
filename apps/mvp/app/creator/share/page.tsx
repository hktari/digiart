import { redirect } from "next/navigation";
import { CreatorSharePanel } from "@/components/creator-share-panel";
import { getOrGenerateReferralCode } from "@/lib/actions/creator";
import { auth } from "@/lib/auth";

export default async function CreatorSharePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const referral = await getOrGenerateReferralCode();

  return <CreatorSharePanel referral={referral} />;
}
