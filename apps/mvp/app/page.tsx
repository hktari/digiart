import { ArrowRight, BookOpen, Package, Palette } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCollectorProfile,
  getCollectorReleaseSelections,
  getCollectorSubscriptions,
} from "@/lib/actions/collector";
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

  const [creatorProfile, collectorProfile, subscriptions, currentCycle] =
    await Promise.all([
      isCreator
        ? db.creatorProfile.findUnique({
            where: { userId: session.user.id },
            include: {
              payoutProfile: {
                select: {
                  isReady: true,
                },
              },
              _count: {
                select: {
                  artworks: { where: { status: "ACTIVE" } },
                  releases: true,
                  subscriptions: { where: { isActive: true } },
                },
              },
            },
          })
        : null,
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

  const overviewCards = [
    {
      label: "Current cycle",
      value: currentCycle?.label ?? "No active cycle",
      detail: currentCycle
        ? `Locks ${new Date(currentCycle.lockDate).toLocaleDateString()}`
        : "New selections will appear here when a cycle opens.",
    },
    {
      label: "Releases published",
      value: isCreator ? String(creatorProfile?._count.releases ?? 0) : "—",
      detail: isCreator
        ? "Publishing output in your account"
        : "Enable publishing to start releasing work",
    },
    {
      label: "Releases selected",
      value: isCollector ? String(selections.length) : "—",
      detail: isCollector
        ? currentCycle
          ? "Selected for the active booklet cycle"
          : "Selections will open when the next cycle begins"
        : "Enable booklet building to start selecting releases",
    },
    {
      label: "Payout readiness",
      value: isCreator ? (payoutReady ? "Ready" : "Setup needed") : "—",
      detail: isCreator
        ? payoutReady
          ? "You can receive payouts"
          : "Add payout details before earnings can be paid"
        : "Only needed if you publish releases",
    },
  ];

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

        {nextActions.length > 0 && (
          <section className="mt-8 rounded-2xl border border-beige-200 bg-beige-50 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Next actions
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Prioritized from your current setup and cycle state.
                </p>
              </div>
              <div className="grid flex-1 gap-3 lg:max-w-3xl lg:grid-cols-2">
                {nextActions.map((action) => (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="rounded-xl border border-beige-200 bg-white px-4 py-4 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      {action.title}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {action.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-neutral-200 bg-white p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-bold text-neutral-900">
                {card.value}
              </p>
              <p className="mt-2 text-sm text-neutral-500">{card.detail}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-600">
                  Publishing
                </p>
                <h2 className="mt-1 text-xl font-semibold text-neutral-900">
                  Release publishing and creator profile
                </h2>
              </div>
              <span className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-xs font-medium text-fuchsia-700">
                {isCreator ? "Enabled" : "Disabled"}
              </span>
            </div>

            {isCreator ? (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-neutral-50 px-4 py-4">
                    <p className="text-sm text-neutral-500">Source images</p>
                    <p className="mt-2 text-2xl font-bold text-neutral-900">
                      {creatorProfile?._count.artworks ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-4 py-4">
                    <p className="text-sm text-neutral-500">Releases</p>
                    <p className="mt-2 text-2xl font-bold text-neutral-900">
                      {creatorProfile?._count.releases ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-4 py-4">
                    <p className="text-sm text-neutral-500">Subscribers</p>
                    <p className="mt-2 text-2xl font-bold text-neutral-900">
                      {creatorProfile?._count.subscriptions ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link
                    href={
                      creatorProfile
                        ? "/creator/releases/new"
                        : "/creator/setup"
                    }
                    className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      Create release
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Publish a new release into the next booklet cycle.
                    </p>
                  </Link>
                  <Link
                    href={
                      creatorProfile ? "/creator/releases" : "/creator/setup"
                    }
                    className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      Manage releases
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Review and edit your publishing workflow.
                    </p>
                  </Link>
                  <Link
                    href={
                      creatorProfile ? "/creator/artworks" : "/creator/setup"
                    }
                    className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      Manage source images
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Keep the artwork pool ready for future releases.
                    </p>
                  </Link>
                  <Link
                    href={
                      creatorProfile ? "/creator/profile" : "/creator/setup"
                    }
                    className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      Edit profile and payouts
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Update collector-facing info and payout readiness.
                    </p>
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6">
                <p className="text-sm font-medium text-neutral-900">
                  Publishing is not enabled on this account yet.
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Turn it on when you want to publish releases and receive
                  payouts.
                </p>
                <Link
                  href="/account/roles"
                  className="mt-4 inline-flex text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
                >
                  Enable publishing →
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
                  Booklets
                </p>
                <h2 className="mt-1 text-xl font-semibold text-neutral-900">
                  Following, release selection, and pricing
                </h2>
              </div>
              <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-xs font-medium text-ocean-700">
                {isCollector ? "Enabled" : "Disabled"}
              </span>
            </div>

            {isCollector ? (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-neutral-50 px-4 py-4">
                    <p className="text-sm text-neutral-500">Artists followed</p>
                    <p className="mt-2 text-2xl font-bold text-neutral-900">
                      {subscriptions.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-4 py-4">
                    <p className="text-sm text-neutral-500">
                      Releases selected
                    </p>
                    <p className="mt-2 text-2xl font-bold text-neutral-900">
                      {selections.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-4 py-4">
                    <p className="text-sm text-neutral-500">Shipping profile</p>
                    <p className="mt-2 text-lg font-bold text-neutral-900">
                      {collectorProfile?.shippingCountry ?? "Setup needed"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link
                    href={
                      collectorProfile
                        ? "/collector/releases"
                        : "/collector/setup"
                    }
                    className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-ocean-300 hover:bg-ocean-50/30"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      Continue booklet
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Select releases for the active cycle.
                    </p>
                  </Link>
                  <Link
                    href={
                      collectorProfile
                        ? "/collector/subscriptions"
                        : "/collector/setup"
                    }
                    className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-ocean-300 hover:bg-ocean-50/30"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      Manage following
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Follow or remove artists feeding your release pool.
                    </p>
                  </Link>
                  <Link
                    href={
                      collectorProfile
                        ? "/collector/discover"
                        : "/collector/setup"
                    }
                    className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-ocean-300 hover:bg-ocean-50/30"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      Discover releases
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Browse more creators and releases for the next booklet.
                    </p>
                  </Link>
                  <Link
                    href={
                      collectorProfile
                        ? "/collector/pricing"
                        : "/collector/setup"
                    }
                    className="rounded-xl border border-neutral-200 px-4 py-4 transition-colors hover:border-ocean-300 hover:bg-ocean-50/30"
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      Review pricing
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      See print, shipping, tax, and total estimate details.
                    </p>
                  </Link>
                </div>

                <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        Recent artists you follow
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        Jump back into creators shaping your current booklet
                        options.
                      </p>
                    </div>
                    <Link
                      href="/collector/subscriptions"
                      className="text-sm font-medium text-ocean-600 hover:text-ocean-700"
                    >
                      View all →
                    </Link>
                  </div>
                  {subscriptions.length === 0 ? (
                    <p className="mt-4 text-sm text-neutral-500">
                      No artists followed yet.
                    </p>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {subscriptions.slice(0, 4).map((subscription) => (
                        <Link
                          key={subscription.id}
                          href={`/creators/${subscription.creatorProfile.slug}`}
                          className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:border-ocean-300 hover:text-ocean-700"
                        >
                          {subscription.creatorProfile.displayName}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6">
                <p className="text-sm font-medium text-neutral-900">
                  Booklet building is not enabled on this account yet.
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Turn it on when you want to follow artists and select
                  releases.
                </p>
                <Link
                  href="/account/roles"
                  className="mt-4 inline-flex text-sm font-medium text-ocean-600 hover:text-ocean-700"
                >
                  Enable booklet building →
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
