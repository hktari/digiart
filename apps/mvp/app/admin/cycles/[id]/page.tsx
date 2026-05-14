import { notFound } from "next/navigation";
import { CycleForm } from "@/components/cycle-form";
import { updateCycle } from "@/lib/actions/cycle-actions";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/roles";

export default async function EditCyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const cycle = await db.subscriptionCycle.findUnique({
    where: { id },
  });

  if (!cycle) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Subscription Cycle</h1>
        <p className="text-muted-foreground mt-1">
          Update cycle dates and status. Status can be manually overridden for
          testing.
        </p>
      </div>

      <CycleForm
        cycle={cycle}
        onSubmit={async (formData) => {
          "use server";
          return updateCycle(id, formData);
        }}
      />
    </div>
  );
}
