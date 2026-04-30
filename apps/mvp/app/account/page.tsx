import Link from "next/link";
import { redirect } from "next/navigation";
import { getCollectorProfile } from "@/lib/actions/collector";
import { getCreatorProfile } from "@/lib/actions/creator";
import { auth } from "@/lib/auth";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const roles = session.user.roles ?? [];
  const [creatorProfile, collectorProfile] = await Promise.all([
    roles.includes("CREATOR") ? getCreatorProfile(session.user.id) : null,
    roles.includes("COLLECTOR") ? getCollectorProfile(session.user.id) : null,
  ]);

  const publishingReady = Boolean(creatorProfile?.status === "PUBLISHED");
  const bookletReady = Boolean(
    collectorProfile?.onboardingState === "COMPLETE",
  );
  const payoutReady = Boolean(creatorProfile?.payoutProfile?.isReady);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Workspace
        </h1>
        <p className="max-w-2xl text-sm text-neutral-600">
          One account can publish releases, manage payouts, follow artists, and
          build booklets from selected releases.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-600">
                Publishing
              </p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-900">
                Release publishing and creator profile
              </h2>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                publishingReady
                  ? "bg-jade-100 text-jade-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {publishingReady
                ? "Ready"
                : roles.includes("CREATOR")
                  ? "Setup needed"
                  : "Disabled"}
            </span>
          </div>

          <p className="text-sm text-neutral-600">
            Build releases, maintain your public profile, and keep payout
            details in sync.
          </p>

          {roles.includes("CREATOR") ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                <p>
                  Profile status:{" "}
                  <span className="font-medium text-neutral-900">
                    {creatorProfile?.status ?? "Not started"}
                  </span>
                </p>
                <p>
                  Payout status:{" "}
                  <span className="font-medium text-neutral-900">
                    {payoutReady ? "Ready" : "Needs details"}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={creatorProfile ? "/creator" : "/creator/setup"}
                  className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700"
                >
                  {creatorProfile
                    ? "Open publishing"
                    : "Start publishing setup"}
                </Link>
                <Link
                  href={creatorProfile ? "/creator/releases" : "/creator/setup"}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Releases
                </Link>
                <Link
                  href={creatorProfile ? "/creator/profile" : "/creator/setup"}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Profile and payouts
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                Turn on publishing when you want to release work and earn from
                the platform.
              </p>
              <Link
                href="/account/roles"
                className="inline-flex rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700"
              >
                Enable publishing
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
                Booklets
              </p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-900">
                Following, release selection, and shipping
              </h2>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                bookletReady
                  ? "bg-jade-100 text-jade-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {bookletReady
                ? "Ready"
                : roles.includes("COLLECTOR")
                  ? "Setup needed"
                  : "Disabled"}
            </span>
          </div>

          <p className="text-sm text-neutral-600">
            Follow artists, select releases for your next booklet, and review
            shipping and pricing details.
          </p>

          {roles.includes("COLLECTOR") ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                <p>
                  Shipping profile:{" "}
                  <span className="font-medium text-neutral-900">
                    {collectorProfile?.shippingCountry ?? "Not set"}
                  </span>
                </p>
                <p>
                  Setup status:{" "}
                  <span className="font-medium text-neutral-900">
                    {collectorProfile?.onboardingState ?? "Not started"}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={collectorProfile ? "/collector" : "/collector/setup"}
                  className="rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-700"
                >
                  {collectorProfile
                    ? "Open booklet area"
                    : "Start booklet setup"}
                </Link>
                <Link
                  href={
                    collectorProfile
                      ? "/collector/releases"
                      : "/collector/setup"
                  }
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Select releases
                </Link>
                <Link
                  href={
                    collectorProfile ? "/collector/pricing" : "/collector/setup"
                  }
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Shipping and pricing
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                Turn on booklet building when you want to follow artists and
                assemble physical releases for upcoming cycles.
              </p>
              <Link
                href="/account/roles"
                className="inline-flex rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-700"
              >
                Enable booklet building
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Capabilities
          </p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">
            Manage what this account can do
          </h2>
        </div>
        <p className="text-sm text-neutral-600">
          Add or remove publishing and booklet-building capabilities from one
          place.
        </p>
        <Link
          href="/account/roles"
          className="inline-flex rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Manage capabilities
        </Link>
      </section>
    </main>
  );
}
