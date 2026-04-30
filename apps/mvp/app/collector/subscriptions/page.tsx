import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CollectorUnsubscribeButton } from "@/components/collector-unsubscribe-button";
import { getCollectorSubscriptions } from "@/lib/actions/collector";
import { auth } from "@/lib/auth";

export default async function CollectorSubscriptionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const subscriptions = await getCollectorSubscriptions(session.user.id);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/account"
            className="text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:text-neutral-600"
          >
            Workspace
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900">
            Artists You Follow
          </h1>
          <p className="mt-2 text-neutral-600">
            These artists feed the release pool you use to build upcoming
            booklets.
          </p>
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">
                No artists followed yet
              </h2>
              <p className="text-neutral-600">
                Start by discovering artists whose releases you want available
                in your booklet workflow.
              </p>
              <Link
                href="/browse/creators"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-fuchsia-600 hover:bg-fuchsia-700"
              >
                Browse artists
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="bg-white rounded-lg border border-neutral-200 p-6 hover:border-fuchsia-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <Link href={`/creators/${subscription.creatorProfile.slug}`}>
                    {subscription.creatorProfile.avatar ? (
                      <Image
                        src={subscription.creatorProfile.avatar}
                        alt={subscription.creatorProfile.displayName}
                        width={64}
                        height={64}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-fuchsia-100 to-ocean-100 flex items-center justify-center">
                        <span className="text-2xl font-bold">
                          {subscription.creatorProfile.displayName
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/creators/${subscription.creatorProfile.slug}`}
                    >
                      <h3 className="font-semibold text-neutral-900 truncate hover:text-fuchsia-700">
                        {subscription.creatorProfile.displayName}
                      </h3>
                    </Link>
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                      {subscription.creatorProfile.bio || "No bio available"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-jade-100 text-jade-800">
                      Active
                    </span>
                    <span className="text-xs text-neutral-500">
                      Since{" "}
                      {new Date(subscription.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <CollectorUnsubscribeButton
                    subscriptionId={subscription.id}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="/browse/creators"
            className="text-sm text-fuchsia-600 hover:text-fuchsia-700 font-medium"
          >
            Discover more artists →
          </Link>
        </div>
      </div>
    </div>
  );
}
