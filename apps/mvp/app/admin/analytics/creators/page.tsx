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
        <p className="text-muted-foreground mt-1">
          Track creator leads from outreach through activation
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 border-b pb-4">
        <Link
          href="/admin/analytics"
          className="text-muted-foreground hover:text-primary font-medium pb-4 -mb-4"
        >
          Overview
        </Link>
        <Link
          href="/admin/analytics/creators"
          className="text-primary font-medium border-b-2 border-primary pb-4 -mb-4"
        >
          Creator Acquisition
        </Link>
        <Link
          href="/admin/analytics/collectors"
          className="text-muted-foreground hover:text-primary font-medium pb-4 -mb-4"
        >
          Collector Funnel
        </Link>
      </div>

      {/* Funnel Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Total Leads</p>
          <p className="text-3xl font-bold mt-1">{totalCreatorLeads}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Contacted</p>
          <p className="text-3xl font-bold mt-1">{contactedLeads}</p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            {contactedRate}% of leads
          </p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Signed Up</p>
          <p className="text-3xl font-bold mt-1">{signedUpCreators}</p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            {signupRate}% of leads
          </p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Published</p>
          <p className="text-3xl font-bold mt-1">{publishedCreators}</p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            {publishRate}% of signed up
          </p>
        </div>
      </div>

      {/* Conversion Funnel Visualization */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Creator Funnel</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-muted-foreground">
              Lead Created
            </div>
            <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-primary/20 h-full absolute left-0 top-0"
                style={{ width: "100%" }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {totalCreatorLeads}
              </span>
            </div>
            <div className="w-16 text-sm text-muted-foreground/70">100%</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-muted-foreground">Contacted</div>
            <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-primary/30 h-full absolute left-0 top-0"
                style={{ width: `${contactedRate}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {contactedLeads}
              </span>
            </div>
            <div className="w-16 text-sm text-muted-foreground/70">
              {contactedRate}%
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-muted-foreground">Signed Up</div>
            <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-primary/40 h-full absolute left-0 top-0"
                style={{ width: `${signupRate}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {signedUpCreators}
              </span>
            </div>
            <div className="w-16 text-sm text-muted-foreground/70">
              {signupRate}%
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-muted-foreground">
              Published Profile
            </div>
            <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-primary/50 h-full absolute left-0 top-0"
                style={{
                  width: `${(publishedCreators / totalCreatorLeads) * 100}%`,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                {publishedCreators}
              </span>
            </div>
            <div className="w-16 text-sm text-muted-foreground/70">
              {Math.round((publishedCreators / totalCreatorLeads) * 100)}%
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-32 text-sm text-muted-foreground">
              Has Releases
            </div>
            <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-primary h-full absolute left-0 top-0"
                style={{
                  width: `${(creatorsWithReleases / totalCreatorLeads) * 100}%`,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-primary-foreground">
                {creatorsWithReleases}
              </span>
            </div>
            <div className="w-16 text-sm text-muted-foreground/70">
              {Math.round((creatorsWithReleases / totalCreatorLeads) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Creator Leads Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Creator Leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Creator
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Source
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Profile
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Releases
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Subscribers
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Views
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creatorLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {lead.creatorProfile?.displayName ??
                          lead.ownerUser?.email ??
                          "—"}
                      </p>
                      {lead.creatorProfile?.slug && (
                        <p className="text-xs text-muted-foreground/70">
                          @{lead.creatorProfile.slug}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                        lead.status === "SIGNED_UP"
                          ? "bg-success-bg text-success-foreground border-success-border"
                          : lead.status === "ACTIVATED"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : lead.status === "CONTACTED"
                              ? "bg-warning-bg text-warning-foreground border-warning-border"
                              : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{lead.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    {lead.creatorProfile ? (
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                          lead.creatorProfile.status === "PUBLISHED"
                            ? "bg-success-bg text-success-foreground border-success-border"
                            : "bg-warning-bg text-warning-foreground border-warning-border"
                        }`}
                      >
                        {lead.creatorProfile.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
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
