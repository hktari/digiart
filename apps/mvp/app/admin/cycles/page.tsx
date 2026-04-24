import Link from "next/link";
import { deleteCycle } from "@/lib/actions/cycle-actions";
import { computeCycleStatus } from "@/lib/cycle-status";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export default async function AdminCyclesPage() {
  await requireAdmin();

  const cycles = await db.subscriptionCycle.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      _count: {
        select: {
          releases: true,
          selections: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Cycles</h1>
          <p className="text-gray-600 mt-1">
            Manage global subscription cycles and lock dates
          </p>
        </div>
        <Link
          href="/admin/cycles/new"
          className="px-4 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700"
        >
          Create Cycle
        </Link>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No cycles created yet.</p>
          <Link
            href="/admin/cycles/new"
            className="text-fuchsia-600 hover:underline mt-2 inline-block"
          >
            Create your first cycle
          </Link>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Lock Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Releases
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Selections
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cycles.map((cycle) => {
                const computedStatus = computeCycleStatus(cycle);
                const statusColor =
                  computedStatus === "OPEN"
                    ? "bg-green-100 text-green-800"
                    : computedStatus === "LOCKED"
                      ? "bg-yellow-100 text-yellow-800"
                      : computedStatus === "PROCESSING"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800";

                return (
                  <tr key={cycle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">
                      {cycle.label}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(2024, cycle.month - 1).toLocaleString(
                        "default",
                        { month: "long" },
                      )}{" "}
                      {cycle.year}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(cycle.lockDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}
                      >
                        {computedStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {cycle._count.releases}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {cycle._count.selections}
                    </td>
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <Link
                        href={`/admin/cycles/${cycle.id}`}
                        className="text-fuchsia-600 hover:underline"
                      >
                        Edit
                      </Link>
                      {cycle._count.releases === 0 &&
                        cycle._count.selections === 0 && (
                          <form
                            action={deleteCycle.bind(null, cycle.id)}
                            className="inline"
                          >
                            <button
                              type="submit"
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </form>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
