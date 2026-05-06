import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export default async function CreatorAcquisitionPage() {
  await requireAdmin();

  // Get creator leads with their full journey
  const creatorLeads = await db.lead.findMany({
    where: { type: "CREATOR" },
    orderBy: { createdAt: "desc" },
    include: {
      creatorProfile: {
        select: {
          displayName: true,
          slug: true,
          status: true,
          _count: {
            select: {
              releases: true,
              subscriptions: true,
              profileViews: true,
            },
          },
        },
      },
      ownerUser: { select: { email: true } },
      events: {
        orderBy: { occurredAt: "desc" },
        take: 1,
      },
    },
    take: 50,
  });

  // Get aggregated stats
  const [
    totalCreatorLeads,
    contactedLeads,
    signedUpCreators,
    publishedCreators,
    creatorsWithReleases,
  ] = await Promise.all([
    db.lead.count({ where: { type: "CREATOR" } }),
    db.lead.count({
      where: {
        type: "CREATOR",
        status: { in: ["CONTACTED", "REPLIED", "QUALIFIED"] },
      },
    }),
    db.lead.count({
      where: { type: "CREATOR", status: { in: ["SIGNED_UP", "ACTIVATED"] } },
    }),
    db.creatorProfile.count({ where: { status: "PUBLISHED" } }),
    db.creatorProfile.count({
      where: {
        releases: { some: {} },
      },
    }),
  ]);

  // Calculate conversion rates
  const contactedRate =
    totalCreatorLeads > 0
      ? Math.round((contactedLeads / totalCreatorLeads) * 100)
      : 0;
  const signupRate =
    totalCreatorLeads > 0
      ? Math.round((signedUpCreators / totalCreatorLeads) * 100)
      : 0;
  const publishRate =
    signedUpCreators > 0
      ? Math.round((publishedCreators / signedUpCreators) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Creator Acquisition</h1>
        <p className="text-gray-600 mt-1">
          Track creator leads from outreach through activation
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
          className="text-fuchsia-600 font-medium border-b-2 border-fuchsia-600 pb-4 -mb-4"
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

      {/* Funnel Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Total Leads</p>
          <p className="text-3xl font-bold mt-1">{totalCreatorLeads}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Contacted</p>
          <p className="text-3xl font-bold mt-1">{contactedLeads}</p>
          <p className="text-xs text-gray-400 mt-2">
            {contactedRate}% of leads
          </p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Signed Up</p>
          <p className="text-3xl font-bold mt-1">{signedUpCreators}</p>
          <p className="text-xs text-gray-400 mt-2">{signupRate}% of leads</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Published</p>
          <p className="text-3xl font-bold mt-1">{publishedCreators}</p>
          <p className="text-xs text-gray-400 mt-2">
            {publishRate}% of signed up
          </p>
        </div>
      </div>

      {/* Conversion Funnel Visualization */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Creator Funnel</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-gray-600">Lead Created</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-fuchsia-200 h-full absolute left-0 top-0"
                style={{ width: "100%" }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {totalCreatorLeads}
              </span>
            </div>
            <div className="w-16 text-sm text-gray-500">100%</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-gray-600">Contacted</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-fuchsia-300 h-full absolute left-0 top-0"
                style={{ width: `${contactedRate}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {contactedLeads}
              </span>
            </div>
            <div className="w-16 text-sm text-gray-500">{contactedRate}%</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-gray-600">Signed Up</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-fuchsia-400 h-full absolute left-0 top-0"
                style={{ width: `${signupRate}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {signedUpCreators}
              </span>
            </div>
            <div className="w-16 text-sm text-gray-500">{signupRate}%</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-gray-600">Published Profile</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-fuchsia-500 h-full absolute left-0 top-0"
                style={{
                  width: `${(publishedCreators / totalCreatorLeads) * 100}%`,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {publishedCreators}
              </span>
            </div>
            <div className="w-16 text-sm text-gray-500">
              {Math.round((publishedCreators / totalCreatorLeads) * 100)}%
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-gray-600">Has Releases</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-fuchsia-600 h-full absolute left-0 top-0"
                style={{
                  width: `${(creatorsWithReleases / totalCreatorLeads) * 100}%`,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white">
                {creatorsWithReleases}
              </span>
            </div>
            <div className="w-16 text-sm text-gray-500">
              {Math.round((creatorsWithReleases / totalCreatorLeads) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Creator Leads Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Creator Leads</h3>
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
                  Source
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Profile
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Releases
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Subscribers
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Views
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creatorLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {lead.creatorProfile?.displayName ??
                          lead.ownerUser?.email ??
                          "—"}
                      </p>
                      {lead.creatorProfile?.slug && (
                        <p className="text-xs text-gray-500">
                          @{lead.creatorProfile.slug}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        lead.status === "SIGNED_UP"
                          ? "bg-green-100 text-green-800"
                          : lead.status === "ACTIVATED"
                            ? "bg-fuchsia-100 text-fuchsia-800"
                            : lead.status === "CONTACTED"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{lead.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    {lead.creatorProfile ? (
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          lead.creatorProfile.status === "PUBLISHED"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {lead.creatorProfile.status}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.creatorProfile?._count.releases ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {lead.creatorProfile?._count.subscriptions ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {lead.creatorProfile?._count.profileViews ?? 0}
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
