import { notFound } from "next/navigation";
import { CycleForm } from "@/components/cycle-form";
import { updateCycle } from "@/lib/actions/cycle-actions";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export default async function EditCyclePage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const cycle = await db.subscriptionCycle.findUnique({
    where: { id: params.id },
  });

  if (!cycle) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Subscription Cycle</h1>
        <p className="text-gray-600 mt-1">
          Update cycle dates and status. Status can be manually overridden for
          testing.
        </p>
      </div>

      <CycleForm
        cycle={cycle}
        onSubmit={async (formData) => {
          "use server";
          return updateCycle(params.id, formData);
        }}
      />
    </div>
  );
}
