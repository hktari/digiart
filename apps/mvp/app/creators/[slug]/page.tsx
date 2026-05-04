import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isUserSubscribedToCreator } from "@/lib/actions/collector";
import { getPublicCreatorProfile } from "@/lib/actions/creator";
import { auth } from "@/lib/auth";
import { getPublicStorageUrl } from "@/lib/s3";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    subscribed?: string;
    autoAddedRelease?: string;
    autoAddSkipped?: string;
    subscriptionError?: string;
  }>;
};

export default async function CreatorProfilePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const profile = await getPublicCreatorProfile(slug);

  if (!profile) {
    notFound();
  }

  const session = await auth();
  const isOwnProfile = session?.user?.id === profile.userId;
  const isSubscribed = session?.user?.id
    ? await isUserSubscribedToCreator(session.user.id, profile.id)
    : false;

  return (
    <div className="bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar */}
          <div className="shrink-0">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.displayName}
                width={160}
                height={160}
                className="rounded-2xl object-cover"
              />
            ) : (
              <div className="w-40 h-40 rounded-2xl bg-linear-to-br from-fuchsia-100 to-ocean-100 flex items-center justify-center">
                <span className="text-5xl">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            {resolvedSearchParams?.subscriptionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {resolvedSearchParams.subscriptionError}
              </div>
            )}

            {resolvedSearchParams?.subscribed === "1" && (
              <div className="rounded-lg border border-jade-200 bg-jade-50 px-4 py-3 text-sm text-jade-800">
                <p className="font-medium">Subscribed successfully.</p>
                {resolvedSearchParams.autoAddedRelease ? (
                  <p>
                    Added{" "}
                    <strong>{resolvedSearchParams.autoAddedRelease}</strong> to
                    your booklet for this cycle.
                  </p>
                ) : resolvedSearchParams.autoAddSkipped === "1" ? (
                  <p>
                    Your creator is now followed. The latest release was not
                    auto-added because your booklet is already at the current
                    maximum.
                  </p>
                ) : (
                  <p>Your creator is now followed.</p>
                )}
              </div>
            )}

            <div>
              <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
                {profile.displayName}
              </h1>
              <p className="text-neutral-500 mt-1">@{profile.slug}</p>
            </div>

            {profile.bio && (
              <p className="text-neutral-700 leading-relaxed max-w-2xl">
                {profile.bio}
              </p>
            )}

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-bold text-neutral-900">
                  {profile._count.subscriptions}
                </span>
                <span className="text-neutral-500 ml-1">subscribers</span>
              </div>
              <div>
                <span className="font-bold text-neutral-900">
                  {profile._count.releases}
                </span>
                <span className="text-neutral-500 ml-1">releases</span>
              </div>
            </div>

            {/* Social links */}
            {profile.socialLinks.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {profile.socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    {link.label}
                    <span className="text-neutral-400">↗</span>
                  </a>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="pt-2">
              {isOwnProfile ? (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
                >
                  Go to your dashboard
                </Link>
              ) : isSubscribed ? (
                <Link
                  href="/collector/subscriptions"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-jade-600 text-jade-700 font-medium hover:bg-jade-50 transition-colors"
                >
                  ✓ Subscribed
                </Link>
              ) : (
                <Link
                  href={`/creators/${slug}/subscribe`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-fuchsia-600 text-white font-medium hover:bg-fuchsia-700 transition-colors"
                >
                  Subscribe
                  <span className="text-lg">→</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Recent releases */}
        {profile.releases.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-neutral-900">
                Recent releases
              </h2>
              {profile._count.releases > 6 && (
                <Link
                  href={`/creators/${slug}/releases`}
                  className="text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
                >
                  View all →
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.releases.map((release) => {
                const coverArtwork = release.artworks[0]?.artwork;
                const coverUrl = coverArtwork
                  ? getPublicStorageUrl(coverArtwork.storageKey)
                  : null;

                return (
                  <Link
                    key={release.id}
                    href={`/creators/${slug}/releases/${release.id}`}
                    className="group rounded-xl border border-neutral-200 bg-white overflow-hidden hover:border-fuchsia-300 hover:shadow-lg transition-all"
                  >
                    {/* Cover image */}
                    <div className="aspect-square bg-neutral-100 relative overflow-hidden">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={release.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <span className="text-6xl">📦</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-neutral-900 line-clamp-1">
                        {release.title}
                      </h3>
                      {release.description && (
                        <p className="text-sm text-neutral-600 line-clamp-2">
                          {release.description}
                        </p>
                      )}
                      <p className="text-xs text-neutral-500">
                        {release._count.artworks}{" "}
                        {release._count.artworks === 1 ? "artwork" : "artworks"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {profile.releases.length === 0 && (
          <div className="text-center py-16">
            <p className="text-neutral-500">
              No releases yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
