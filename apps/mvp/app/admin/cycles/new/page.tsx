import { requireAdmin } from "@/lib/roles";
import { CycleForm } from "@/components/cycle-form";
import { createCycle } from "@/lib/actions/cycle-actions";

export default async function NewCyclePage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Subscription Cycle</h1>
        <p className="text-gray-600 mt-1">
          Set up a new monthly subscription cycle with lock and fulfillment dates
        </p>
      </div>

      <CycleForm onSubmit={createCycle} />
    </div>
  );
}
