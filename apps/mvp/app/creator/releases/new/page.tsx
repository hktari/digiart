import { NewReleaseForm } from "@/components/new-release-form";
import { getCurrentCycle } from "@/lib/cycle-utils";
import { computeCycleStatus } from "@/lib/cycle-status";
import { redirect } from "next/navigation";

export default async function CreatorReleaseNewPage() {
  const currentCycle = await getCurrentCycle();
  const cycleStatus = currentCycle ? computeCycleStatus(currentCycle) : null;

  if (!currentCycle || cycleStatus !== "OPEN") {
    redirect("/creator/releases");
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-8">
        New release
      </h1>
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Releases must be published before{" "}
          {new Date(currentCycle.lockDate).toLocaleDateString()} to be included
          in this cycle.
        </p>
      </div>
      <NewReleaseForm />
    </div>
  );
}
