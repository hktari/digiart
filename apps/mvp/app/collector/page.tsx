import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCollectorProfile,
  getCollectorReleaseSelections,
  getCollectorSubscriptions,
} from "@/lib/actions/collector";
import { getCurrentCycle } from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";

export default async function CollectorDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await getCollectorProfile(session.user.id);
  if (!collectorProfile) {
    redirect("/collector/setup");
  }

  const [subscriptions, currentCycle] = await Promise.all([
    getCollectorSubscriptions(session.user.id),
    getCurrentCycle(),
  ]);

  const selections = currentCycle
    ? await getCollectorReleaseSelections(session.user.id, currentCycle.id)
    : [];

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">
            Welcome back, {collectorProfile.displayName || "Collector"}
          </h1>
          <p className="mt-2 text-neutral-600">
            Manage your subscriptions and monthly booklet selections
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Subscriptions</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">
                  {subscriptions.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-fuchsia-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-fuchsia-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
            <Link
              href="/collector/subscriptions"
              className="mt-4 text-sm text-fuchsia-600 hover:text-fuchsia-700 font-medium"
            >
              View all →
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Selected Releases</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">
                  {selections.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-ocean-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-ocean-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
            <Link
              href="/collector/releases"
              className="mt-4 text-sm text-ocean-600 hover:text-ocean-700 font-medium"
            >
              Manage selections →
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Current Cycle</p>
                <p className="text-lg font-bold text-neutral-900 mt-1">
                  {currentCycle ? currentCycle.label : "No active cycle"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-jade-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-jade-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            {currentCycle && (
              <p className="mt-4 text-xs text-neutral-500">
                Lock date:{" "}
                {new Date(currentCycle.lockDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-fuchsia-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-fuchsia-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">
                Start Your Collection
              </h2>
              <p className="text-neutral-600">
                Discover creators and subscribe to their monthly releases to
                build your personalized art booklet
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/browse/creators"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-fuchsia-600 hover:bg-fuchsia-700"
                >
                  Browse Creators
                </Link>
                <Link
                  href="/collector/discover"
                  className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
                >
                  Discover Releases
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-900">
                Your Subscriptions
              </h2>
              <Link
                href="/collector/subscriptions"
                className="text-sm text-fuchsia-600 hover:text-fuchsia-700 font-medium"
              >
                View all →
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {subscriptions.slice(0, 4).map((subscription) => (
                <Link
                  key={subscription.id}
                  href={`/creators/${subscription.creatorProfile.slug}`}
                  className="bg-white rounded-lg border border-neutral-200 p-4 hover:border-fuchsia-300 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    {subscription.creatorProfile.avatar ? (
                      <Image
                        src={subscription.creatorProfile.avatar}
                        alt={subscription.creatorProfile.displayName}
                        width={80}
                        height={80}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-100 to-ocean-100 flex items-center justify-center">
                        <span className="text-2xl font-bold">
                          {subscription.creatorProfile.displayName
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {subscription.creatorProfile.displayName}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        Since{" "}
                        {new Date(subscription.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="bg-gradient-to-r from-ocean-50 to-fuchsia-50 rounded-lg border border-ocean-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-ocean-600 flex items-center justify-center shrink-0">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900">
                    Discover More Creators
                  </h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    Expand your collection by exploring more artists and their
                    releases
                  </p>
                  <Link
                    href="/collector/discover"
                    className="inline-flex items-center mt-3 text-sm font-medium text-ocean-600 hover:text-ocean-700"
                  >
                    Start exploring →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
