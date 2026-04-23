import { redirect } from "next/navigation";
import { CollectorSetupForm } from "@/components/collector-setup-form";
import { getCollectorProfile } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";

export default async function CollectorSetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const profile = await getCollectorProfile(session.user.id);

  if (profile && profile.onboardingState === "COMPLETE") {
    redirect("/collector");
  }

  return (
    <CollectorSetupForm
      initialData={
        profile
          ? {
              displayName: profile.displayName ?? undefined,
              shippingCountry: profile.shippingCountry ?? undefined,
            }
          : undefined
      }
    />
  );
}
