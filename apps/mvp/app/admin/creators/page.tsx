import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCreatorsPage() {
  await requireAdmin();

  const [creators, totals] = await Promise.all([
    db.creatorProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, createdAt: true } },
        payoutProfile: {
          select: { isReady: true, isPayPalVerified: true, paypalEmail: true },
        },
        leads: {
          select: {
            source: true,
            campaign: true,
            status: true,
            utmSource: true,
            utmCampaign: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            artworks: true,
            releases: true,
            subscriptions: true,
            profileViews: true,
          },
        },
      },
    }),
    Promise.all([
      db.creatorProfile.count(),
      db.creatorProfile.count({ where: { status: "PUBLISHED" } }),
      db.release.count({ where: { status: "PUBLISHED" } }),
      db.collectorCreatorSubscription.count({ where: { isActive: true } }),
    ]),
  ]);

  const [totalCreators, publishedCreators, publishedReleases, activeSubs] =
    totals;
  const activatedCreators = creators.filter(
    (creator) => creator._count.releases > 0,
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creators</h1>
          <p className="text-gray-600 mt-1">
            Inspect signed-up creators, publishing progress, GTM source, and
            support readiness.
          </p>
        </div>
        <Link
          href="/admin/analytics/creators"
          className="text-sm font-medium text-fuchsia-600 hover:underline"
        >
          View creator funnel →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Signed Up</p>
          <p className="text-3xl font-bold mt-1">{totalCreators}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Published Profiles</p>
          <p className="text-3xl font-bold mt-1">{publishedCreators}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">With Releases</p>
          <p className="text-3xl font-bold mt-1">{activatedCreators}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Active Subscriptions</p>
          <p className="text-3xl font-bold mt-1">{activeSubs}</p>
          <p className="text-xs text-gray-400 mt-2">
            {publishedReleases} published releases
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="font-semibold">Creator Accounts</h2>
          <p className="text-sm text-gray-500 mt-1">
            Prioritize support for creators with unpublished profiles, missing
            payout setup, or early collector traction.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Creator
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Content
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Traction
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Source
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Payout
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creators.map((creator) => {
                const lead = creator.leads[0];
                const leadSource =
                  lead?.source ??
                  lead?.utmSource ??
                  creator.sourcePlatform ??
                  "—";
                const campaign = lead?.campaign ?? lead?.utmCampaign;

                return (
                  <tr key={creator.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-foreground">
                        {creator.displayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {creator.user.email}
                      </div>
                      <Link
                        href={`/creators/${creator.slug}`}
                        className="text-xs text-fuchsia-600 hover:underline"
                      >
                        /creators/{creator.slug}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          creator.status === "PUBLISHED"
                            ? "bg-green-100 text-green-800"
                            : creator.status === "DRAFT"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {creator.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div>{creator._count.artworks} artworks</div>
                      <div>{creator._count.releases} releases</div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div>{creator._count.subscriptions} subscriptions</div>
                      <div>{creator._count.profileViews} profile views</div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div>{leadSource}</div>
                      {campaign && (
                        <div className="text-xs text-gray-500">{campaign}</div>
                      )}
                      {lead?.status && (
                        <div className="text-xs text-gray-500">
                          Lead: {lead.status}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {creator.payoutProfile?.isReady ? (
                        <span className="text-green-700">Ready</span>
                      ) : (
                        <span className="text-amber-700">Needs setup</span>
                      )}
                      {creator.payoutProfile?.isPayPalVerified && (
                        <div className="text-xs text-gray-500">
                          PayPal verified
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {formatDate(creator.createdAt)}
                      <div className="text-xs text-gray-500">
                        User {formatDate(creator.user.createdAt)}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {creators.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No creator accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
