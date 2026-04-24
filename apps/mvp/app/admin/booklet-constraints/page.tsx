"use client";

import { useState, useEffect } from "react";
import { ConstraintForm } from "@/components/constraint-form";
import {
  createConstraint,
  updateConstraint,
  deleteConstraint,
  toggleConstraintActive,
} from "@/lib/actions/constraint-actions";
import type { BookletConstraint } from "@prisma/client";

export default function AdminBookletConstraintsPage() {
  const [constraints, setConstraints] = useState<BookletConstraint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConstraint, setEditingConstraint] =
    useState<BookletConstraint | null>(null);

  const loadConstraints = async () => {
    try {
      const response = await fetch("/api/admin/booklet-constraints");
      const data = await response.json();
      setConstraints(data);
    } catch (error) {
      console.error("Failed to load constraints:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConstraints();
  }, []);

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
          <p className="text-gray-600 mt-1">
            Configure min/max page rules for booklet eligibility
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingConstraint(null);
          }}
          className="px-4 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700"
        >
          {showForm ? "Cancel" : "New Version"}
        </button>
      </div>

      {activeConstraint && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-green-900">
                Active Constraint (v{activeConstraint.version})
              </h2>
              <div className="mt-2 space-y-1 text-sm text-green-800">
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
              onClick={() => setEditingConstraint(activeConstraint)}
              className="text-green-700 hover:underline text-sm"
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">No constraints created yet.</p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                    Pages
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                    Max Creators
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                    Max Releases
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {constraints.map((constraint) => (
                  <tr key={constraint.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">
                      v{constraint.version}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {constraint.minPages} - {constraint.maxPages}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {constraint.maxCreators ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {constraint.maxReleases ?? "-"}
                    </td>
                    <td className="px-6 py-4">
                      {constraint.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(constraint.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <button
                        onClick={() => handleToggleActive(constraint.id)}
                        className="text-fuchsia-600 hover:underline"
                      >
                        {constraint.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => setEditingConstraint(constraint)}
                        className="text-fuchsia-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(constraint.id)}
                        className="text-red-600 hover:underline"
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
