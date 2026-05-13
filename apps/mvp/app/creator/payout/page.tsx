import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { computeCycleStatus } from "@/lib/cycle-status";
import { getCurrentCycle } from "@/lib/cycle-utils";
import { db } from "@/lib/db";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground/60 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold font-mono text-card-foreground">
        {value}
      </p>
      <p className="text-xs text-muted-foreground/40">{sub}</p>
    </div>
  );
}

function InfoBox({
  variant,
  children,
}: {
  variant: "neutral" | "yellow" | "blue" | "green" | "red";
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "bg-muted border-border text-muted-foreground",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-700",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-700",
    green: "bg-green-500/10 border-green-500/20 text-green-700",
    red: "bg-red-500/10 border-red-500/20 text-red-700",
  };
  return (
    <div className={`border rounded-lg p-4 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SENT: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export default async function CreatorPayoutPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const profile = await db.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) redirect("/creator/setup");

  const currentCycle = await getCurrentCycle();

  const payouts = await db.creatorPayout.findMany({
    where: { creatorProfileId: profile.id },
    include: {
      cycle: {
        select: { id: true, label: true, lockDate: true, status: true },
      },
    },
    orderBy: { calculatedAt: "desc" },
  });

  const currentCyclePayout = payouts.find(
    (p) => currentCycle && p.cycleId === currentCycle.id,
  );
  const pastPayouts = payouts.filter(
    (p) => !currentCycle || p.cycleId !== currentCycle.id,
  );
  const cycleStatus = currentCycle ? computeCycleStatus(currentCycle) : null;

  const currentSelections = currentCycle
    ? await db.collectorReleaseSelection.count({
        where: {
          cycleId: currentCycle.id,
          release: { creatorProfileId: profile.id },
        },
      })
    : 0;

  const totalSelections = await db.collectorReleaseSelection.count({
    where: { release: { creatorProfileId: profile.id } },
  });

  const totalEarned = payouts
    .filter((p) => p.status === "SENT")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-8">
        Payouts
      </h1>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Current cycle"
          value={
            currentCyclePayout
              ? `${Number(currentCyclePayout.amount).toFixed(2)}`
              : "—"
          }
          sub={currentCyclePayout ? currentCyclePayout.currency : "EUR"}
        />
        <StatCard
          label="Selected this cycle"
          value={String(currentSelections)}
          sub="times"
        />
        <StatCard
          label="Total selected"
          value={String(totalSelections)}
          sub="all time"
        />
        <StatCard
          label="Total earned"
          value={totalEarned.toFixed(2)}
          sub="EUR"
        />
      </div>

      {/* Current cycle status */}
      {currentCycle && cycleStatus && (
        <div className="mb-8">
          {cycleStatus === "OPEN" && (
            <InfoBox variant="neutral">
              The current cycle <strong>{currentCycle.label}</strong> is still{" "}
              <strong>open</strong>. Actual payouts are calculated when the
              cycle locks on{" "}
              {currentCycle.lockDate.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . Your releases have been selected{" "}
              <strong>{currentSelections}</strong> time
              {currentSelections !== 1 ? "s" : ""} so far.
            </InfoBox>
          )}

          {cycleStatus === "LOCKED" && !currentCyclePayout && (
            <InfoBox variant="yellow">
              The cycle <strong>{currentCycle.label}</strong> is locked and
              payouts are being calculated. Your earnings will appear here once
              processing is complete.
            </InfoBox>
          )}

          {cycleStatus === "PROCESSING" && !currentCyclePayout && (
            <InfoBox variant="blue">
              The cycle <strong>{currentCycle.label}</strong> is in processing.
              Payouts will be calculated once fulfillment is complete.
            </InfoBox>
          )}

          {currentCyclePayout && currentCyclePayout.status === "PENDING" && (
            <InfoBox variant="yellow">
              Your payout of{" "}
              <strong>
                {Number(currentCyclePayout.amount).toFixed(2)}{" "}
                {currentCyclePayout.currency}
              </strong>{" "}
              for <strong>{currentCycle.label}</strong> is pending. It will be
              sent via PayPal once the admin processes payouts for this cycle.
            </InfoBox>
          )}

          {currentCyclePayout && currentCyclePayout.status === "SENT" && (
            <InfoBox variant="green">
              Your payout of{" "}
              <strong>
                {Number(currentCyclePayout.amount).toFixed(2)}{" "}
                {currentCyclePayout.currency}
              </strong>{" "}
              for <strong>{currentCycle.label}</strong> has been sent via
              PayPal.
            </InfoBox>
          )}

          {currentCyclePayout && currentCyclePayout.status === "FAILED" && (
            <InfoBox variant="red">
              Your payout for <strong>{currentCycle.label}</strong> failed.
              {currentCyclePayout.errorMessage && (
                <> Reason: {currentCyclePayout.errorMessage}.</>
              )}
            </InfoBox>
          )}
        </div>
      )}

      {/* Past payouts */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-card-foreground">
            Past payouts
            {pastPayouts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground/40">
                {pastPayouts.length} cycle
                {pastPayouts.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>
        </div>

        {pastPayouts.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground/40 text-sm">
            No past payouts yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground/60">
                  Cycle
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground/60">
                  Amount
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground/60">
                  Status
                </th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground/60">
                  Sent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pastPayouts.map((payout) => (
                <tr
                  key={payout.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-foreground">
                    {payout.cycle.label}
                  </td>
                  <td className="px-6 py-4 font-mono">
                    {Number(payout.amount).toFixed(2)}{" "}
                    <span className="text-xs text-muted-foreground/40">
                      {payout.currency}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_BADGE[payout.status] ?? STATUS_BADGE.PENDING
                      }`}
                    >
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground/70">
                    {payout.sentAt
                      ? new Date(payout.sentAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
