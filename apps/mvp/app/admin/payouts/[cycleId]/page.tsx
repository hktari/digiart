import { notFound } from "next/navigation";
import { PayoutActionButtons } from "@/components/admin/payout-action-buttons";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export default async function AdminCyclePayoutsPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  await requireAdmin();
  const { cycleId } = await params;

  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: cycleId },
    include: {
      payoutCalculations: true,
      creatorPayouts: {
        include: {
          creatorProfile: {
            select: {
              displayName: true,
              slug: true,
              payoutProfile: {
                select: { paypalEmail: true, isReady: true, legalName: true },
              },
            },
          },
        },
        orderBy: { calculatedAt: "desc" },
      },
    },
  });

  if (!cycle) notFound();

  const calc = cycle.payoutCalculations[0];
  const payouts = cycle.creatorPayouts;
  const hasPending = payouts.some((p) => p.status === "PENDING");
  const hasSent = payouts.some((p) => p.status === "SENT");

  const statusCounts = {
    pending: payouts.filter((p) => p.status === "PENDING").length,
    sent: payouts.filter((p) => p.status === "SENT").length,
    failed: payouts.filter((p) => p.status === "FAILED").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-ink/40 mb-1">
          <a href="/admin/payouts" className="hover:text-fuchsia-600">
            Payouts
          </a>{" "}
          /
        </p>
        <h1 className="text-3xl font-bold">{cycle.label}</h1>
        <p className="text-ink/60 mt-1">Creator earnings &amp; disbursements</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-beige-200 bg-white p-4">
          <p className="text-xs text-ink/40 uppercase tracking-wide">Pool</p>
          <p className="mt-1 text-2xl font-bold font-mono">
            {calc ? Number(calc.totalMarkupPool).toFixed(2) : "—"}
          </p>
          {calc && <p className="text-xs text-ink/40">EUR</p>}
        </div>
        <div className="rounded-lg border border-beige-200 bg-white p-4">
          <p className="text-xs text-ink/40 uppercase tracking-wide">
            Fulfilled
          </p>
          <p className="mt-1 text-2xl font-bold">
            {calc
              ? `${calc.totalFulfilledCollectors}/${calc.totalPaidCollectors}`
              : "—"}
          </p>
          {calc && <p className="text-xs text-ink/40">collectors</p>}
        </div>
        <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-4">
          <p className="text-xs text-yellow-600 uppercase tracking-wide">
            Pending
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-800">
            {statusCounts.pending}
          </p>
        </div>
        <div className="rounded-lg border border-green-100 bg-green-50 p-4">
          <p className="text-xs text-green-600 uppercase tracking-wide">Sent</p>
          <p className="mt-1 text-2xl font-bold text-green-800">
            {statusCounts.sent}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-lg border border-beige-200 bg-white p-6 space-y-3">
        <h2 className="text-base font-semibold">Actions</h2>
        <PayoutActionButtons
          cycleId={cycleId}
          hasPendingPayouts={hasPending}
          hasSentPayouts={hasSent}
          hasCalculation={!!calc}
        />
      </div>

      {/* Payout table */}
      <div className="rounded-lg border border-beige-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-100">
          <h2 className="text-base font-semibold">
            Creator Payouts
            {payouts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-ink/40">
                {payouts.length} total
                {statusCounts.failed > 0 && (
                  <span className="ml-2 text-red-600">
                    · {statusCounts.failed} failed
                  </span>
                )}
              </span>
            )}
          </h2>
        </div>

        {payouts.length === 0 ? (
          <div className="px-6 py-10 text-center text-ink/40 text-sm">
            No payouts calculated yet. Click &ldquo;Calculate Earnings&rdquo; to
            start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-beige-50 border-b border-beige-100">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-ink/60">
                    Creator
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-ink/60">
                    Legal Name
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-ink/60">
                    PayPal Email
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-ink/60">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-ink/60">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-ink/60">
                    Batch ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-100">
                {payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="hover:bg-beige-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink">
                        {payout.creatorProfile.displayName}
                      </p>
                      <p className="text-xs text-ink/40">
                        @{payout.creatorProfile.slug}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-ink/70">
                      {payout.creatorProfile.payoutProfile?.legalName ?? (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-ink/70">
                      {payout.creatorProfile.payoutProfile?.paypalEmail ? (
                        <span
                          className={
                            payout.creatorProfile.payoutProfile.isReady
                              ? "text-green-700"
                              : "text-yellow-700"
                          }
                        >
                          {payout.creatorProfile.payoutProfile.paypalEmail}
                        </span>
                      ) : (
                        <span className="text-red-500 text-xs">
                          Not configured
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {Number(payout.amount).toFixed(2)}{" "}
                      <span className="text-xs text-ink/40">
                        {payout.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          payout.status === "SENT"
                            ? "bg-green-100 text-green-800"
                            : payout.status === "FAILED"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {payout.status}
                      </span>
                      {payout.errorMessage && (
                        <p className="mt-1 text-xs text-red-500">
                          {payout.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-ink/40 font-mono text-xs">
                      {payout.paypalBatchId ? (
                        payout.paypalBatchId
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
