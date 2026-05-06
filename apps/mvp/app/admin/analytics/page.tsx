import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get key metrics
  const [
    totalLeads,
    newLeadsThisMonth,
    creatorLeads,
    collectorLeads,
    signedUpLeads,
    _totalEvents,
    attributionSessions,
    creatorProfileViews,
  ] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.lead.count({ where: { type: "CREATOR" } }),
    db.lead.count({ where: { type: "COLLECTOR" } }),
    db.lead.count({ where: { status: "SIGNED_UP" } }),
    db.leadEvent.count(),
    db.attributionSession.count(),
    db.creatorProfileView.count(),
  ]);

  // Get top sources
  const topSources = await db.lead.groupBy({
    by: ["source"],
    _count: { id: true },
    where: { source: { not: null } },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  // Get recent leads
  const recentLeads = await db.lead.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      creatorProfile: { select: { displayName: true, slug: true } },
      ownerUser: { select: { email: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics Cockpit</h1>
        <p className="text-gray-600 mt-1">
          GTM metrics and funnel tracking for founder decision-making
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 border-b pb-4">
        <Link
          href="/admin/analytics"
          className="text-fuchsia-600 font-medium border-b-2 border-fuchsia-600 pb-4 -mb-4"
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
          className="text-gray-600 hover:text-fuchsia-600 font-medium pb-4 -mb-4"
        >
          Collector Funnel
        </Link>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Total Leads</p>
          <p className="text-3xl font-bold mt-1">{totalLeads}</p>
          <p className="text-xs text-gray-400 mt-2">
            +{newLeadsThisMonth} this month
          </p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Signed Up</p>
          <p className="text-3xl font-bold mt-1">{signedUpLeads}</p>
          <p className="text-xs text-gray-400 mt-2">
            {totalLeads > 0
              ? `${Math.round((signedUpLeads / totalLeads) * 100)}% conversion`
              : "N/A"}
          </p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Attribution Sessions</p>
          <p className="text-3xl font-bold mt-1">{attributionSessions}</p>
          <p className="text-xs text-gray-400 mt-2">Pre-auth tracking active</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Creator Page Views</p>
          <p className="text-3xl font-bold mt-1">{creatorProfileViews}</p>
          <p className="text-xs text-gray-400 mt-2">Public profile traffic</p>
        </div>
      </div>

      {/* Lead Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Leads by Type</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Creator Leads</span>
              <span className="font-medium">{creatorLeads}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-fuchsia-500 h-2 rounded-full"
                style={{
                  width: `${totalLeads > 0 ? (creatorLeads / totalLeads) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm">Collector Leads</span>
              <span className="font-medium">{collectorLeads}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-ocean-500 h-2 rounded-full"
                style={{
                  width: `${totalLeads > 0 ? (collectorLeads / totalLeads) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Top Sources</h3>
          <div className="space-y-3">
            {topSources.length === 0 ? (
              <p className="text-sm text-gray-500">No source data yet</p>
            ) : (
              topSources.map((source) => (
                <div
                  key={source.source ?? "unknown"}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm capitalize">
                    {source.source ?? "Unknown"}
                  </span>
                  <span className="font-medium">{source._count.id}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Recent Leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Source
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Creator / User
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  First Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        lead.type === "CREATOR"
                          ? "bg-fuchsia-100 text-fuchsia-800"
                          : "bg-ocean-100 text-ocean-800"
                      }`}
                    >
                      {lead.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        lead.status === "SIGNED_UP"
                          ? "bg-green-100 text-green-800"
                          : lead.status === "NEW"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{lead.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    {lead.creatorProfile?.displayName ??
                      lead.ownerUser?.email ??
                      "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {lead.firstSeenAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
