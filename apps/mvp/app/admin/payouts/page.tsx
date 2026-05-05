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
        <p className="text-ink/60 mt-1">
          Manage payout calculations and disbursements per cycle
        </p>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-beige-50 border border-beige-200 rounded-lg p-8 text-center">
          <p className="text-ink/60">No cycles found.</p>
        </div>
      ) : (
        <div className="bg-white border border-beige-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-beige-50 border-b border-beige-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-ink/60">
                  Cycle
                </th>
                <th className="px-6 py-3 text-left font-medium text-ink/60">
                  Pool
                </th>
                <th className="px-6 py-3 text-left font-medium text-ink/60">
                  Creators
                </th>
                <th className="px-6 py-3 text-left font-medium text-ink/60">
                  PENDING
                </th>
                <th className="px-6 py-3 text-left font-medium text-ink/60">
                  SENT
                </th>
                <th className="px-6 py-3 text-left font-medium text-ink/60">
                  FAILED
                </th>
                <th className="px-6 py-3 text-right font-medium text-ink/60"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beige-100">
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
                    className="hover:bg-beige-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-ink">
                      {cycle.label}
                    </td>
                    <td className="px-6 py-4 text-ink/70">
                      {pool !== null ? (
                        <span className="font-mono">
                          {pool.toFixed(2)}{" "}
                          <span className="text-xs text-ink/40">EUR</span>
                        </span>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-ink/70">
                      {payouts.length || <span className="text-ink/30">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {pending > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {pending}
                        </span>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {sent > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {sent}
                        </span>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {failed > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {failed}
                        </span>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/payouts/${cycle.id}`}
                        className="text-fuchsia-600 hover:underline text-sm"
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
