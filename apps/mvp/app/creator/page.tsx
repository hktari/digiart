import Link from "next/link";
import { getCreatorDashboardData } from "@/lib/actions/creator";

export default async function CreatorDashboardPage() {
  const profile = await getCreatorDashboardData();

  const stats = [
    {
      label: "Active artworks",
      value: profile._count.artworks,
      href: "/creator/artworks",
      cta: "Upload artwork",
      ctaHref: "/creator/artworks/new",
      empty: profile._count.artworks === 0,
    },
    {
      label: "Releases",
      value: profile._count.releases,
      href: "/creator/releases",
      cta: "Create release",
      ctaHref: "/creator/releases/new",
      empty: profile._count.releases === 0,
    },
    {
      label: "Active subscribers",
      value: profile._count.subscriptions,
      href: null,
      cta: null,
      ctaHref: null,
      empty: false,
    },
  ];

  const profileComplete =
    profile.status === "PUBLISHED" || (profile.displayName && profile.slug);

  const payoutReady = profile.payoutProfile?.isReady ?? false;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {profile.displayName}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            creators/{profile.slug}
          </p>
        </div>
        <Link
          href="/creator/profile"
          className="shrink-0 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          Edit profile
        </Link>
      </div>

      {/* Setup nudges */}
      {(!profileComplete || !payoutReady) && (
        <div className="space-y-2">
          {!profileComplete && (
            <div className="flex items-center justify-between rounded-lg border border-beige-300 bg-beige-50 px-4 py-3">
              <p className="text-sm text-beige-800">
                Complete your creator profile to go live.
              </p>
              <Link
                href="/creator/setup"
                className="ml-4 shrink-0 text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
              >
                Finish setup →
              </Link>
            </div>
          )}
          {!payoutReady && (
            <div className="flex items-center justify-between rounded-lg border border-ocean-200 bg-ocean-50 px-4 py-3">
              <p className="text-sm text-ocean-800">
                Add payout details to receive payments.
              </p>
              <Link
                href="/creator/profile"
                className="ml-4 shrink-0 text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700"
              >
                Add payout info →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-neutral-200 bg-white p-5 space-y-1"
          >
            <p className="text-3xl font-bold text-neutral-900">{stat.value}</p>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">
              {stat.label}
            </p>
            {stat.empty && stat.cta && stat.ctaHref && (
              <Link
                href={stat.ctaHref}
                className="inline-block pt-1 text-xs font-medium text-fuchsia-600 hover:text-fuchsia-700"
              >
                {stat.cta} →
              </Link>
            )}
            {!stat.empty && stat.href && (
              <Link
                href={stat.href}
                className="inline-block pt-1 text-xs font-medium text-neutral-400 hover:text-neutral-600"
              >
                View all →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/creator/artworks/new"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-fuchsia-300 hover:bg-fuchsia-50/30 transition-colors group"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-200 transition-colors text-lg">
              🖼
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                Upload artwork
              </p>
              <p className="text-xs text-neutral-500">JPEG or PNG</p>
            </div>
          </Link>

          <Link
            href="/creator/releases/new"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-fuchsia-300 hover:bg-fuchsia-50/30 transition-colors group"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-200 transition-colors text-lg">
              📦
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                New release
              </p>
              <p className="text-xs text-neutral-500">Bundle artworks</p>
            </div>
          </Link>

          <Link
            href="/creator/artworks"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-fuchsia-300 hover:bg-fuchsia-50/30 transition-colors group"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200 transition-colors text-lg">
              🗂
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                Manage artworks
              </p>
              <p className="text-xs text-neutral-500">
                {profile._count.artworks} active
              </p>
            </div>
          </Link>

          <Link
            href={`/creators/${profile.slug}`}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-fuchsia-300 hover:bg-fuchsia-50/30 transition-colors group"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200 transition-colors text-lg">
              👤
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                View public profile
              </p>
              <p className="text-xs text-neutral-500">
                See what collectors see
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
