import Link from "next/link";
import { getAllCyclesPayoutSummary } from "@/lib/actions/payout-actions";
import { requireAdmin } from "@/lib/roles";

export default async function AdminPayoutsPage() {
  await requireAdmin();
  const cycles = await getAllCyclesPayoutSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Creator Payouts</h1>
        <p className="text-gray-600 mt-1">
          Calculate and send creator earnings per cycle
        </p>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No cycles created yet.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Cycle
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Markup Pool
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Payouts
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cycles.map((cycle) => {
                const calc = cycle.payoutCalculations[0];
                const payouts = cycle.creatorPayouts;
                const sentCount = payouts.filter(
                  (p) => p.status === "SENT",
                ).length;
                const pendingCount = payouts.filter(
                  (p) => p.status === "PENDING",
                ).length;
                const failedCount = payouts.filter(
                  (p) => p.status === "FAILED",
                ).length;
                const totalAmount = payouts.reduce(
                  (s, p) => s + Number(p.amount),
                  0,
                );

                return (
                  <tr key={cycle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">
                      {cycle.label}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {calc
                        ? `€${Number(calc.totalMarkupPool).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payouts.length > 0
                        ? `${payouts.length} creators · €${totalAmount.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {payouts.length === 0 ? (
                        <span className="text-xs text-gray-400">
                          Not calculated
                        </span>
                      ) : (
                        <div className="flex gap-1.5">
                          {sentCount > 0 && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              {sentCount} sent
                            </span>
                          )}
                          {pendingCount > 0 && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              {pendingCount} pending
                            </span>
                          )}
                          {failedCount > 0 && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              {failedCount} failed
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <Link
                        href={`/admin/payouts/${cycle.id}`}
                        className="text-fuchsia-600 hover:underline"
                      >
                        Manage
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
