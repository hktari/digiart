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
                select: {
                  paypalEmail: true,
                  isReady: true,
                  legalName: true,
                  isPayPalVerified: true,
                },
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
        <p className="text-sm text-muted-foreground/40 mb-1">
          <a href="/admin/payouts" className="hover:text-primary">
            Payouts
          </a>{" "}
          /
        </p>
        <h1 className="text-3xl font-bold">{cycle.label}</h1>
        <p className="text-muted-foreground/60 mt-1">
          Creator earnings &amp; disbursements
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground/60 uppercase tracking-wide">
            Pool
          </p>
          <p className="mt-1 text-2xl font-bold font-mono">
            {calc ? Number(calc.totalMarkupPool).toFixed(2) : "—"}
          </p>
          {calc && <p className="text-xs text-muted-foreground/60">EUR</p>}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground/60 uppercase tracking-wide">
            Fulfilled
          </p>
          <p className="mt-1 text-2xl font-bold">
            {calc
              ? `${calc.totalFulfilledCollectors}/${calc.totalPaidCollectors}`
              : "—"}
          </p>
          {calc && (
            <p className="text-xs text-muted-foreground/60">collectors</p>
          )}
        </div>
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4">
          <p className="text-xs text-warning-foreground uppercase tracking-wide">
            Pending
          </p>
          <p className="mt-1 text-2xl font-bold text-warning">
            {statusCounts.pending}
          </p>
        </div>
        <div className="rounded-lg border border-success-border bg-success-bg p-4">
          <p className="text-xs text-success-foreground uppercase tracking-wide">
            Sent
          </p>
          <p className="mt-1 text-2xl font-bold text-success">
            {statusCounts.sent}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h2 className="text-base font-semibold">Actions</h2>
        <PayoutActionButtons
          cycleId={cycleId}
          hasPendingPayouts={hasPending}
          hasSentPayouts={hasSent}
          hasCalculation={!!calc}
        />
      </div>

      {/* Payout table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold">
            Creator Payouts
            {payouts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground/60">
                {payouts.length} total
                {statusCounts.failed > 0 && (
                  <span className="ml-2 text-destructive">
                    · {statusCounts.failed} failed
                  </span>
                )}
              </span>
            )}
          </h2>
        </div>

        {payouts.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground/60 text-sm">
            No payouts calculated yet. Click &ldquo;Calculate Earnings&rdquo; to
            start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Creator
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Legal Name
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    PayPal Email
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Verified
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                    Batch ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">
                        {payout.creatorProfile.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        @{payout.creatorProfile.slug}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {payout.creatorProfile.payoutProfile?.legalName ?? (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {payout.creatorProfile.payoutProfile?.paypalEmail ? (
                        <span
                          className={
                            payout.creatorProfile.payoutProfile.isReady
                              ? "text-success-foreground"
                              : "text-warning-foreground"
                          }
                        >
                          {payout.creatorProfile.payoutProfile.paypalEmail}
                        </span>
                      ) : (
                        <span className="text-destructive text-xs">
                          Not configured
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {payout.creatorProfile.payoutProfile?.isPayPalVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-foreground border border-success-border">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-warning-bg text-warning-foreground border border-warning-border">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {Number(payout.amount).toFixed(2)}{" "}
                      <span className="text-xs text-muted-foreground/60">
                        {payout.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          payout.status === "SENT"
                            ? "bg-success-bg text-success-foreground border border-success-border"
                            : payout.status === "FAILED"
                              ? "bg-destructive-bg text-destructive-foreground border border-destructive-border"
                              : "bg-warning-bg text-warning-foreground border border-warning-border"
                        }`}
                      >
                        {payout.status}
                      </span>
                      {payout.errorMessage && (
                        <p className="mt-1 text-xs text-destructive">
                          {payout.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground/60 font-mono text-xs">
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
