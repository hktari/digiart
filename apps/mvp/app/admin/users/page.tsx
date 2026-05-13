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

function formatRoles(roles: { role: string }[]) {
  return roles.length > 0 ? roles.map((role) => role.role).join(", ") : "—";
}

export default async function AdminUsersPage() {
  await requireAdmin();

  const [users, totalUsers, creatorUsers, collectorUsers, paidCollectors] =
    await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          roles: { select: { role: true } },
          lead: {
            select: {
              type: true,
              status: true,
              source: true,
              campaign: true,
              utmSource: true,
              utmCampaign: true,
              creatorProfile: { select: { displayName: true, slug: true } },
            },
          },
          creatorProfile: {
            select: {
              displayName: true,
              slug: true,
              status: true,
              _count: {
                select: {
                  artworks: true,
                  releases: true,
                  subscriptions: true,
                  profileViews: true,
                },
              },
            },
          },
          collectorProfile: {
            select: {
              displayName: true,
              shippingCountry: true,
              onboardingState: true,
              _count: {
                select: {
                  subscriptions: true,
                  selections: true,
                  billingRecords: true,
                  fulfillmentOrders: true,
                },
              },
            },
          },
        },
        take: 100,
      }),
      db.user.count(),
      db.user.count({ where: { creatorProfile: { isNot: null } } }),
      db.user.count({ where: { collectorProfile: { isNot: null } } }),
      db.collectorProfile.count({
        where: { billingRecords: { some: { status: "PAID" } } },
      }),
    ]);

  const activatedCreators = users.filter(
    (user) => (user.creatorProfile?._count.releases ?? 0) > 0,
  ).length;
  const subscribedCollectors = users.filter(
    (user) => (user.collectorProfile?._count.subscriptions ?? 0) > 0,
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-gray-600 mt-1">
            Inspect signed-up creators and collectors with GTM, activation, and
            support stats.
          </p>
        </div>
        <div className="flex gap-3 text-sm font-medium">
          <Link
            href="/admin/creators"
            className="text-fuchsia-600 hover:underline"
          >
            Creator accounts →
          </Link>
          <Link
            href="/admin/analytics/collectors"
            className="text-fuchsia-600 hover:underline"
          >
            Collector funnel →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-3xl font-bold mt-1">{totalUsers}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Creators</p>
          <p className="text-3xl font-bold mt-1">{creatorUsers}</p>
          <p className="text-xs text-gray-400 mt-2">
            {activatedCreators} with releases
          </p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Collectors</p>
          <p className="text-3xl font-bold mt-1">{collectorUsers}</p>
          <p className="text-xs text-gray-400 mt-2">
            {subscribedCollectors} subscribed
          </p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Paid Collectors</p>
          <p className="text-3xl font-bold mt-1">{paidCollectors}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-500">Recent Scope</p>
          <p className="text-3xl font-bold mt-1">{users.length}</p>
          <p className="text-xs text-gray-400 mt-2">latest accounts shown</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="font-semibold">Signed-up users</h2>
          <p className="text-sm text-gray-500 mt-1">
            Use this as a founder support queue: spot incomplete collector
            setup, creator activation gaps, and high-intent leads.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Roles
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Creator Stats
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Collector Stats
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  GTM Source
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Support Signal
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => {
                const source =
                  user.lead?.source ?? user.lead?.utmSource ?? "direct/unknown";
                const campaign = user.lead?.campaign ?? user.lead?.utmCampaign;
                const needsCollectorSetup =
                  user.collectorProfile?.onboardingState &&
                  user.collectorProfile.onboardingState !== "COMPLETE";
                const needsCreatorActivation =
                  user.creatorProfile &&
                  user.creatorProfile._count.releases === 0;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-foreground">
                        {user.name ?? user.email}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      {user.lead?.creatorProfile && (
                        <Link
                          href={`/creators/${user.lead.creatorProfile.slug}`}
                          className="text-xs text-fuchsia-600 hover:underline"
                        >
                          entered via {user.lead.creatorProfile.displayName}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {formatRoles(user.roles)}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {user.creatorProfile ? (
                        <>
                          <Link
                            href={`/creators/${user.creatorProfile.slug}`}
                            className="font-medium text-fuchsia-600 hover:underline"
                          >
                            {user.creatorProfile.displayName}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {user.creatorProfile.status}
                          </div>
                          <div>
                            {user.creatorProfile._count.releases} releases
                          </div>
                          <div>
                            {user.creatorProfile._count.subscriptions}{" "}
                            subscribers
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {user.collectorProfile ? (
                        <>
                          <div>{user.collectorProfile.onboardingState}</div>
                          <div>
                            {user.collectorProfile._count.subscriptions} creator
                            subs
                          </div>
                          <div>
                            {user.collectorProfile._count.selections} picks
                          </div>
                          <div>
                            {user.collectorProfile._count.billingRecords} orders
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.collectorProfile.shippingCountry ??
                              "No country"}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div>{source}</div>
                      {campaign && (
                        <div className="text-xs text-gray-500">{campaign}</div>
                      )}
                      {user.lead && (
                        <div className="text-xs text-gray-500">
                          {user.lead.type} · {user.lead.status}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {needsCollectorSetup && (
                        <div className="text-amber-700">
                          Finish collector setup
                        </div>
                      )}
                      {needsCreatorActivation && (
                        <div className="text-amber-700">
                          Help publish first release
                        </div>
                      )}
                      {!needsCollectorSetup && !needsCreatorActivation && (
                        <span className="text-green-700">
                          No obvious blocker
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No users yet.
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
