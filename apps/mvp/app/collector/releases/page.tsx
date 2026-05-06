import { redirect } from "next/navigation";
import {
  getCollectorProfile,
  getCollectorReleaseSelections,
} from "@/lib/actions/collector";
import {
  getAvailableReleasesForCycle,
  getCurrentCycle,
} from "@/lib/actions/cycles";
import { auth } from "@/lib/auth";
import { CollectorReleasesClient } from "./collector-releases-client";

export default async function CollectorReleasesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const collectorProfile = await getCollectorProfile(session.user.id);
  if (!collectorProfile) {
    redirect("/collector/setup");
  }

  const currentCycle = await getCurrentCycle();

  if (!currentCycle) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900">
              Booklet Release Selection
            </h1>
            <p className="mt-2 text-neutral-600">
              Choose complete releases for your booklet
            </p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-ocean-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-ocean-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  role="img"
                >
                  <title>Calendar icon</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">
                No active cycle
              </h2>
              <p className="text-neutral-600">
                There is no active subscription cycle at the moment. Check back
                soon!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [availableReleases, selections] = await Promise.all([
    getAvailableReleasesForCycle(currentCycle.id),
    getCollectorReleaseSelections(session.user.id, currentCycle.id),
  ]);

  const selectedReleaseIds = new Set<string>(
    selections.map((s: { release: { id: string } }) => s.release.id),
  );

  return (
    <CollectorReleasesClient
      initialReleases={availableReleases}
      initialSelectedReleaseIds={selectedReleaseIds}
      currentCycle={{
        id: currentCycle.id,
        label: currentCycle.label,
        lockDate: currentCycle.lockDate.toISOString(),
      }}
    />
  );
}
