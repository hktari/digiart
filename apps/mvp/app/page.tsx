import { ArrowRight, BookOpen, Package, Palette } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardTabs } from "@/components/dashboard-tabs";
import {
  getCollectorProfile,
  getCollectorReleaseSelections,
  getCollectorSubscriptions,
} from "@/lib/actions/collector";
import { getCreatorDashboardStats } from "@/lib/actions/creator";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function PublicHomePage() {
  return (
    <div className="flex flex-col">
      <section className="flex flex-col items-center justify-center bg-paper px-4 py-20 text-center md:py-32">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-ocean-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-ocean-700">
            <BookOpen className="h-3.5 w-3.5" />
            Art subscription platform
          </div>
          <h1 className="font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl md:text-6xl">
            Release-led art booklets,{" "}
            <span className="text-ocean-600">delivered</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink/60">
            One account lets you publish releases, build a booklet from the
            releases you love, and understand exactly how booklet pricing and
            artist payouts are calculated.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/browse/releases"
              className="inline-flex items-center justify-center gap-2 rounded bg-ocean-600 px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ocean-700"
            >
              Browse releases
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded border border-beige-200 bg-paper-dark px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-beige-200"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-paper-dark py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center font-serif text-2xl font-bold text-ink md:text-3xl">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                icon: Palette,
                title: "Artists publish releases",
                description:
                  "Artists group their work into releases that can stand on their own and feed upcoming booklet cycles.",
              },
              {
                icon: BookOpen,
                title: "You build your booklet",
                description:
                  "Subscribers select complete releases instead of handpicking artworks one by one.",
              },
              {
                icon: Package,
                title: "Costs stay transparent",
                description:
                  "Every order makes the print, shipping, tax, platform fee, and artist payout contribution visible before checkout.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="flex flex-col items-center gap-4 p-6 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ocean-100">
                  <step.icon
                    className="h-5 w-5 text-ocean-600"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="font-semibold text-ink">{step.title}</h3>
                <p className="text-sm leading-relaxed text-ink/60">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper px-4 py-16 sm:px-6 lg:px-8 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-2xl font-bold text-ink md:text-3xl">
            Ready to publish or collect?
          </h2>
          <p className="mt-4 text-ink/60">
            Start with one account, then turn on the parts of the platform you
            want to use.
          </p>
          <Link
            href="/auth/sign-up"
            className="mt-8 inline-flex items-center gap-2 rounded bg-ocean-600 px-8 py-3 text-sm font-medium text-paper transition-colors hover:bg-ocean-700"
          >
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <PublicHomePage />;
  }

  const roles = session.user.roles ?? [];
  const isCreator = roles.includes("CREATOR");
  const isCollector = roles.includes("COLLECTOR");

  if (!isCreator && !isCollector) {
    redirect("/onboarding");
  }

  const [
    creatorProfile,
    creatorStats,
    collectorProfile,
    subscriptions,
    currentCycle,
  ] = await Promise.all([
    isCreator
      ? db.creatorProfile.findUnique({
          where: { userId: session.user.id },
          include: {
            payoutProfile: { select: { isReady: true } },
          },
        })
      : null,
    isCreator ? getCreatorDashboardStats() : null,
    isCollector ? getCollectorProfile(session.user.id) : null,
    isCollector ? getCollectorSubscriptions(session.user.id) : [],
    getCurrentCycle(),
  ]);

  const selections =
    isCollector && currentCycle
      ? await getCollectorReleaseSelections(session.user.id, currentCycle.id)
      : [];

  const creatorProfileComplete = Boolean(
    creatorProfile?.status === "PUBLISHED" ||
      (creatorProfile?.displayName && creatorProfile?.slug),
  );
  const payoutReady = creatorProfile?.payoutProfile?.isReady ?? false;

  const nextActions = [
    isCreator &&
      !creatorProfile && {
        title: "Start creator setup",
        description: "Set your display name, slug, and payout details.",
        href: "/creator/setup",
      },
    isCreator &&
      creatorProfile &&
      !creatorProfileComplete && {
        title: "Finish your creator profile",
        description:
          "Complete the profile collectors will see before you publish.",
        href: "/creator/setup",
      },
    isCreator &&
      creatorProfile &&
      !payoutReady && {
        title: "Add payout details",
        description:
          "Complete payout info so earnings can be routed correctly.",
        href: "/creator/profile",
      },
    isCollector &&
      !collectorProfile && {
        title: "Complete booklet setup",
        description: "Add your shipping profile before building a booklet.",
        href: "/collector/setup",
      },
    isCollector &&
      collectorProfile &&
      subscriptions.length === 0 && {
        title: "Follow your first artist",
        description:
          "Follow artists to expand the release pool for your booklet.",
        href: "/browse/creators",
      },
    isCollector &&
      collectorProfile &&
      currentCycle &&
      selections.length === 0 && {
        title: "Select releases for this cycle",
        description: "Build your booklet by choosing complete releases.",
        href: "/collector/releases",
      },
  ].filter(Boolean) as Array<{
    title: string;
    description: string;
    href: string;
  }>;

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Dashboard
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Your workspace
          </h1>
          <p className="max-w-3xl text-sm text-neutral-600">
            One account can publish releases, follow artists, and build a
            booklet from the releases you want in the next cycle.
          </p>
        </div>

        <DashboardTabs
          isCreator={isCreator}
          isCollector={isCollector}
          creatorStats={creatorStats}
          creatorProfile={creatorProfile}
          collectorData={
            isCollector
              ? { collectorProfile, subscriptions, selections, currentCycle }
              : null
          }
          nextActions={nextActions}
        />
      </div>
    </main>
  );
}
