import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export default async function AdminPayoutsPage() {
  await requireAdmin();

  const cycles = await db.subscriptionCycle.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      payoutCalculations: true,
      creatorPayouts: {
        select: { status: true, amount: true, currency: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Creator Payouts</h1>
        <p className="text-muted-foreground mt-1">
          Manage payout calculations and disbursements per cycle
        </p>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-muted border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No cycles found.</p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  Cycle
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  Pool
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  Creators
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  PENDING
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  SENT
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  FAILED
                </th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cycles.map((cycle) => {
                const payouts = cycle.creatorPayouts;
                const pending = payouts.filter(
                  (p) => p.status === "PENDING",
                ).length;
                const sent = payouts.filter((p) => p.status === "SENT").length;
                const failed = payouts.filter(
                  (p) => p.status === "FAILED",
                ).length;
                const calc = cycle.payoutCalculations[0];
                const pool = calc ? Number(calc.totalMarkupPool) : null;

                return (
                  <tr
                    key={cycle.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      {cycle.label}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {pool !== null ? (
                        <span className="font-mono">
                          {pool.toFixed(2)}{" "}
                          <span className="text-xs text-muted-foreground/60">
                            EUR
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {payouts.length || (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {pending > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-warning-bg text-warning-foreground border border-warning-border">
                          {pending}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {sent > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-foreground border border-success-border">
                          {sent}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {failed > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-destructive-bg text-destructive-foreground border border-destructive-border">
                          {failed}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/payouts/${cycle.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        Manage →
                      </Link>
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
