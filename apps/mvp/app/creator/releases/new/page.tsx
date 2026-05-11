export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { NewReleaseForm } from "@/components/new-release-form";
import { computeCycleStatus } from "@/lib/cycle-status";
import { getCurrentCycle } from "@/lib/cycle-utils";

export default async function CreatorReleaseNewPage() {
  const currentCycle = await getCurrentCycle();
  const cycleStatus = currentCycle ? computeCycleStatus(currentCycle) : null;

  if (!currentCycle || cycleStatus !== "OPEN") {
    const errorMessage = !currentCycle
      ? "No active cycle available"
      : `Cycle ${cycleStatus?.toLowerCase()}: New releases cannot be created at this time`;
    redirect(`/creator/releases?error=${encodeURIComponent(errorMessage)}`);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-8">
        New release
      </h1>
      <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-600">
          <strong>Note:</strong> Releases must be published before{" "}
          {new Date(currentCycle.lockDate).toLocaleDateString()} to be included
          in this cycle.
        </p>
      </div>
      <NewReleaseForm />
    </div>
  );
}
