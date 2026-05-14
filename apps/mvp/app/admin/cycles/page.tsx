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
          <p className="text-muted-foreground mt-1">
            Manage global subscription cycles and lock dates
          </p>
        </div>
        <Link
          href="/admin/cycles/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Create Cycle
        </Link>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-muted border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No cycles created yet.</p>
          <Link
            href="/admin/cycles/new"
            className="text-primary hover:underline mt-2 inline-block"
          >
            Create your first cycle
          </Link>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                  Lock Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                  Releases
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                  Selections
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cycles.map((cycle) => {
                const computedStatus = computeCycleStatus(cycle);
                const statusColor =
                  computedStatus === "OPEN"
                    ? "bg-success-bg text-success-foreground border border-success-border"
                    : computedStatus === "LOCKED"
                      ? "bg-warning-bg text-warning-foreground border border-warning-border"
                      : computedStatus === "PROCESSING"
                        ? "bg-info-bg text-info-foreground border border-info-border"
                        : "bg-muted text-muted-foreground border border-border";

                return (
                  <tr key={cycle.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-sm font-medium">
                      {cycle.label}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(2024, cycle.month - 1).toLocaleString(
                        "default",
                        { month: "long" },
                      )}{" "}
                      {cycle.year}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(cycle.lockDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}
                      >
                        {computedStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {cycle._count.releases}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {cycle._count.selections}
                    </td>
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <Link
                        href={`/admin/cycles/${cycle.id}`}
                        className="text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      {cycle._count.releases === 0 &&
                        cycle._count.selections === 0 && (
                          <form
                            action={async () => {
                              "use server";
                              await deleteCycle(cycle.id);
                            }}
                            className="inline"
                          >
                            <button
                              type="submit"
                              className="text-destructive hover:underline"
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
