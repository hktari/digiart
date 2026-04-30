import { redirect } from "next/navigation";
import { assignRole, revokeRole } from "@/lib/actions/roles";
import { auth } from "@/lib/auth";
import { getUserRoles } from "@/lib/roles";

const ALL_ROLES = [
  {
    role: "CREATOR" as const,
    label: "Publish releases",
    emoji: "🎨",
    description: "Publish releases, share them, and earn payouts.",
  },
  {
    role: "COLLECTOR" as const,
    label: "Build booklets",
    emoji: "📬",
    description: "Select releases and build upcoming booklets.",
  },
];

export default async function AccountRolesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const roles = await getUserRoles(session.user.id);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Your roles</h1>
          <p className="text-sm text-neutral-500">
            One account can publish releases and build booklets.
          </p>
        </div>
        <div className="space-y-3">
          {ALL_ROLES.map(({ role, label, emoji, description }) => {
            const active = roles.includes(role);
            return (
              <div
                key={role}
                className={`flex items-center justify-between rounded-xl border-2 p-4 ${
                  active
                    ? "border-fuchsia-400 bg-fuchsia-50"
                    : "border-neutral-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <div className="font-semibold">{label}</div>
                    <p className="text-xs text-neutral-500">{description}</p>
                  </div>
                </div>
                {active ? (
                  <form action={revokeRole.bind(null, role)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                    >
                      Remove
                    </button>
                  </form>
                ) : (
                  <form action={assignRole.bind(null, role)}>
                    <button
                      type="submit"
                      className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-700 transition-colors"
                    >
                      Add
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        <a
          href="/account"
          className="block text-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          ← Back to account
        </a>
      </div>
    </main>
  );
}
