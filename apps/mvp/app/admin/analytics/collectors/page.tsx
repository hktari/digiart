import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export default async function CollectorFunnelPage() {
  await requireAdmin();

  // Get collector leads
  const collectorLeads = await db.lead.findMany({
    where: { type: "COLLECTOR" },
    orderBy: { createdAt: "desc" },
    include: {
      creatorProfile: { select: { displayName: true, slug: true } },
      ownerUser: {
        select: {
          email: true,
          collectorProfile: {
            select: {
              shippingCountry: true,
              _count: {
                select: {
                  subscriptions: true,
                  selections: true,
                  billingRecords: true,
                },
              },
            },
          },
        },
      },
      events: {
        where: {
          eventName: {
            in: [
              "auth_completed",
              "collector_setup_completed",
              "creator_subscription_completed",
              "release_selected",
              "pricing_viewed",
            ],
          },
        },
        orderBy: { occurredAt: "desc" },
      },
    },
    take: 50,
  });

  // Get aggregated stats
  const [
    totalCollectorLeads,
    signedUpCollectors,
    activatedCollectors,
    totalSubscriptions,
    totalSelections,
  ] = await Promise.all([
    db.lead.count({ where: { type: "COLLECTOR" } }),
    db.lead.count({
      where: {
        type: "COLLECTOR",
        status: { in: ["SIGNED_UP", "ACTIVATED"] },
      },
    }),
    db.collectorProfile.count(),
    db.collectorCreatorSubscription.count(),
    db.collectorReleaseSelection.count(),
  ]);

  // Calculate metrics
  const signupRate =
    totalCollectorLeads > 0
      ? Math.round((signedUpCollectors / totalCollectorLeads) * 100)
      : 0;
  const activationRate =
    signedUpCollectors > 0
      ? Math.round((activatedCollectors / signedUpCollectors) * 100)
      : 0;
  const avgSubscriptionsPerCollector =
    activatedCollectors > 0
      ? Math.round((totalSubscriptions / activatedCollectors) * 10) / 10
      : 0;

  // Get top referring creators
  const topReferringCreators = await db.lead.groupBy({
    by: ["creatorProfileId"],
    where: {
      type: "COLLECTOR",
      creatorProfileId: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const creatorIds = topReferringCreators
    .map((c) => c.creatorProfileId)
    .filter(Boolean) as string[];

  const creators = await db.creatorProfile.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, displayName: true, slug: true },
  });

  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Collector Funnel</h1>
        <p className="text-gray-600 mt-1">
          Track collector journey from discovery to subscription
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 border-b pb-4">
        <Link
          href="/admin/analytics"
          className="text-gray-600 hover:text-fuchsia-600 font-medium pb-4 -mb-4"
        >
          Overview
        </Link>
        <Link
          href="/admin/analytics/creators"
          className="text-gray-600 hover:text-fuchsia-600 font-medium pb-4 -mb-4"
        >
          Creator Acquisition
        </Link>
        <Link
          href="/admin/analytics/collectors"
          className="text-fuchsia-600 font-medium border-b-2 border-fuchsia-600 pb-4 -mb-4"
        >
          Collector Funnel
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Collector Leads</p>
          <p className="text-3xl font-bold mt-1">{totalCollectorLeads}</p>
          <p className="text-xs text-gray-400 mt-2">{signupRate}% signed up</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Active Collectors</p>
          <p className="text-3xl font-bold mt-1">{activatedCollectors}</p>
          <p className="text-xs text-gray-400 mt-2">
            {activationRate}% of signed up
          </p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Total Subscriptions</p>
          <p className="text-3xl font-bold mt-1">{totalSubscriptions}</p>
          <p className="text-xs text-gray-400 mt-2">
            {avgSubscriptionsPerCollector} per collector
          </p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Release Selections</p>
          <p className="text-3xl font-bold mt-1">{totalSelections}</p>
          <p className="text-xs text-gray-400 mt-2">Across all cycles</p>
        </div>
      </div>

      {/* Top Referring Creators */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Top Referring Creators</h3>
        {topReferringCreators.length === 0 ? (
          <p className="text-sm text-gray-500">
            No creator referrals recorded yet
          </p>
        ) : (
          <div className="space-y-3">
            {topReferringCreators.map((creator) => {
              const profile = creator.creatorProfileId
                ? creatorMap.get(creator.creatorProfileId)
                : null;
              return (
                <div
                  key={creator.creatorProfileId ?? "unknown"}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm">
                    {profile ? (
                      <Link
                        href={`/creators/${profile.slug}`}
                        className="text-fuchsia-600 hover:underline"
                      >
                        {profile.displayName}
                      </Link>
                    ) : (
                      "Unknown creator"
                    )}
                  </span>
                  <span className="font-medium">{creator._count.id} leads</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collector Leads Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Collector Journey</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Collector
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Source / Creator
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Country
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Subscriptions
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Selections
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Orders
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {collectorLeads.map((lead) => {
                const _hasSetup = lead.ownerUser?.collectorProfile != null;
                const lastEvent = lead.events[0];

                return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {lead.ownerUser?.email ?? lead.email ?? "Anonymous"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          lead.status === "ACTIVATED"
                            ? "bg-green-100 text-green-800"
                            : lead.status === "SIGNED_UP"
                              ? "bg-fuchsia-100 text-fuchsia-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.creatorProfile ? (
                        <Link
                          href={`/creators/${lead.creatorProfile.slug}`}
                          className="text-fuchsia-600 hover:underline"
                        >
                          {lead.creatorProfile.displayName}
                        </Link>
                      ) : (
                        <span className="capitalize">{lead.source ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.ownerUser?.collectorProfile?.shippingCountry ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {lead.ownerUser?.collectorProfile?._count.subscriptions ??
                        0}
                    </td>
                    <td className="px-4 py-3">
                      {lead.ownerUser?.collectorProfile?._count.selections ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {lead.ownerUser?.collectorProfile?._count
                        .billingRecords ?? 0}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {lastEvent
                        ? new Date(lastEvent.occurredAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Attribution Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              Top UTM Sources
            </h4>
            <SourceBreakdown groupBy="utmSource" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              Top UTM Mediums
            </h4>
            <SourceBreakdown groupBy="utmMedium" />
          </div>
        </div>
      </div>
    </div>
  );
}

async function SourceBreakdown({
  groupBy,
}: {
  groupBy: "utmSource" | "utmMedium";
}) {
  const results = await db.lead.groupBy({
    by: [groupBy],
    where: { [groupBy]: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  if (results.length === 0) {
    return <p className="text-sm text-gray-500">No data available</p>;
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <div
          key={result[groupBy] ?? "unknown"}
          className="flex justify-between"
        >
          <span className="text-sm capitalize">
            {result[groupBy] ?? "Unknown"}
          </span>
          <span className="text-sm font-medium">{result._count.id}</span>
        </div>
      ))}
    </div>
  );
}
