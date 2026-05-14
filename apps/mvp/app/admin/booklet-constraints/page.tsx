"use client";

import type { BookletConstraint } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import { ConstraintForm } from "@/components/constraint-form";
import {
  createConstraint,
  deleteConstraint,
  toggleConstraintActive,
  updateConstraint,
} from "@/lib/actions/constraint-actions";

export default function AdminBookletConstraintsPage() {
  const [constraints, setConstraints] = useState<BookletConstraint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConstraint, setEditingConstraint] =
    useState<BookletConstraint | null>(null);

  const loadConstraints = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/booklet-constraints");
      const data = await response.json();
      setConstraints(data);
    } catch (error) {
      console.error("Failed to load constraints:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConstraints();
  }, [loadConstraints]);

  const handleCreate = async (formData: FormData) => {
    const result = await createConstraint(formData);
    if (result.success) {
      await loadConstraints();
      setShowForm(false);
    }
    return result;
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingConstraint) return { error: "No constraint selected" };
    const result = await updateConstraint(editingConstraint.id, formData);
    if (result.success) {
      await loadConstraints();
      setEditingConstraint(null);
    }
    return result;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this constraint?")) return;
    await deleteConstraint(id);
    await loadConstraints();
  };

  const handleToggleActive = async (id: string) => {
    await toggleConstraintActive(id);
    await loadConstraints();
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const activeConstraint = constraints.find((c) => c.isActive);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Booklet Constraints</h1>
          <p className="text-muted-foreground mt-1">
            Configure min/max page rules for booklet eligibility
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setEditingConstraint(null);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {showForm ? "Cancel" : "New Version"}
        </button>
      </div>

      {activeConstraint && (
        <div className="bg-success-bg border border-success-border rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-success-foreground">
                Active Constraint (v{activeConstraint.version})
              </h2>
              <div className="mt-2 space-y-1 text-sm text-success-foreground">
                <p>
                  <strong>Pages:</strong> {activeConstraint.minPages} -{" "}
                  {activeConstraint.maxPages}
                </p>
                {activeConstraint.maxCreators && (
                  <p>
                    <strong>Max Creators:</strong>{" "}
                    {activeConstraint.maxCreators}
                  </p>
                )}
                {activeConstraint.maxReleases && (
                  <p>
                    <strong>Max Releases:</strong>{" "}
                    {activeConstraint.maxReleases}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingConstraint(activeConstraint)}
              className="text-success hover:underline text-sm"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {(showForm || editingConstraint) && (
        <ConstraintForm
          constraint={editingConstraint ?? undefined}
          onSubmit={editingConstraint ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingConstraint(null);
          }}
        />
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Version History</h2>
        {constraints.length === 0 ? (
          <div className="bg-muted border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No constraints created yet.</p>
          </div>
        ) : (
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    Pages
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    Max Creators
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    Max Releases
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {constraints.map((constraint) => (
                  <tr key={constraint.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-sm font-medium">
                      v{constraint.version}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {constraint.minPages} - {constraint.maxPages}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {constraint.maxCreators ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {constraint.maxReleases ?? "-"}
                    </td>
                    <td className="px-6 py-4">
                      {constraint.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-success-bg text-success-foreground border border-success-border">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground border border-border">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(constraint.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(constraint.id)}
                        className="text-primary hover:underline"
                      >
                        {constraint.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingConstraint(constraint)}
                        className="text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(constraint.id)}
                        className="text-destructive hover:underline"
                      >
                        Delete
                      </button>
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
