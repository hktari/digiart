import { ArrowRight, BookOpen, Package, Palette } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AttributionTracker } from "@/components/attribution-tracker";
import { DashboardTabs } from "@/components/dashboard-tabs";
import {
  getCollectorProfile,
  getCollectorReleaseSelections,
  getCollectorSubscriptions,
} from "@/lib/actions/collector";
import { getCreatorDashboardStats } from "@/lib/actions/creator";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { trackPageView } from "@/lib/analytics/events";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserRoles } from "@/lib/roles";

async function getCollectorCheckoutIntent(
  collectorProfileId: string,
  cycleId: string,
) {
  return db.checkoutIntent.findUnique({
    where: {
      collectorProfileId_cycleId: {
        collectorProfileId,
        cycleId,
      },
    },
    select: {
      orderedManually: true,
      orderedAt: true,
      retailTotalAmount: true,
      committedAt: true,
    },
  });
}

function PublicHomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12 text-center sm:py-20 md:py-32">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-ocean-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-ocean-600 dark:text-ocean-400">
            <BookOpen className="h-3.5 w-3.5" />
            Workspace
          </div>
          <h1 className="mb-4 font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            Welcome back
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            Sign in to manage your releases, build your booklet, or explore
            artists.
          </p>

          <div className="grid grid-cols-1 gap-6 text-left md:grid-cols-2">
            {/* For Collectors */}
            <div className="flex flex-col rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-ocean-500/10 text-ocean-600 dark:text-ocean-400">
                <Package className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground">
                For Collectors
              </h2>
              <p className="mb-6 flex-1 text-muted-foreground">
                Browse releases, curate your custom booklet, and track your
                subscriptions.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/browse"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-ocean-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ocean-700"
                >
                  Browse releases
                </Link>
                <Link
                  href="/auth/sign-in"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Sign in
                </Link>
              </div>
            </div>

            {/* For Creators */}
            <div className="flex flex-col rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400">
                <Palette className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground">
                For Creators
              </h2>
              <p className="mb-6 flex-1 text-muted-foreground">
                Publish new artworks and releases, track your earnings, and
                manage your creator profile.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/auth/sign-in"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  Sign in as Creator
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type HomePageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();
  const resolvedSearchParams = searchParams ? await searchParams : {};

  // Capture attribution for anonymous users
  if (!session?.user?.id) {
    const searchParamsRecord: Record<string, string> = {};
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === "string") {
        searchParamsRecord[key] = value;
      }
    }
    void trackPageView("/", { isAnonymous: true });
    return (
      <>
        <AttributionTracker searchParams={searchParamsRecord} pathname="/" />
        <PublicHomePage />
      </>
    );
  }

  const roles = await getUserRoles(session.user.id);
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
    isCollector
      ? getCollectorProfile(session.user.id, { allowPrefill: false })
      : null,
    isCollector ? getCollectorSubscriptions(session.user.id) : [],
    getCurrentCycle(),
  ]);

  const selections =
    isCollector && currentCycle
      ? await getCollectorReleaseSelections(session.user.id, currentCycle.id)
      : [];

  // Fetch checkout intent for the dashboard
  const checkoutIntent =
    isCollector && collectorProfile && currentCycle
      ? await getCollectorCheckoutIntent(collectorProfile.id, currentCycle.id)
      : null;

  // Track page view for authenticated users
  void trackPageView("/", { userId: session.user.id });

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Dashboard
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Your workspace
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            One account can publish releases, follow artists, and build a
            booklet from the releases you want in the next cycle.
          </p>
        </div>

        <DashboardTabs
          isCreator={isCreator}
          isCollector={isCollector}
          creatorStats={creatorStats}
          creatorProfile={creatorProfile}
          creatorOnboardingComplete={
            creatorProfile?.onboardingComplete ?? false
          }
          collectorData={
            isCollector
              ? {
                  collectorProfile,
                  subscriptions,
                  selections,
                  currentCycle,
                  checkoutIntent: checkoutIntent
                    ? {
                        orderedManually: checkoutIntent.orderedManually,
                        orderedAt:
                          checkoutIntent.orderedAt?.toISOString() ?? null,
                        retailTotalAmount: checkoutIntent.retailTotalAmount
                          ? Number(checkoutIntent.retailTotalAmount)
                          : null,
                        committedAt:
                          checkoutIntent.committedAt?.toISOString() ?? null,
                      }
                    : null,
                }
              : null
          }
        />
      </div>
    </main>
  );
}
