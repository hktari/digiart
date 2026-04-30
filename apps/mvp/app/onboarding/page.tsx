import { redirect } from "next/navigation";
import { assignRole } from "@/lib/actions/roles";
import { auth } from "@/lib/auth";
import { getUserRoles } from "@/lib/roles";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const roles = await getUserRoles(session.user.id);

  if (roles.length > 0) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">
            Welcome! How will you use the platform?
          </h1>
          <p className="text-sm text-neutral-500">
            One account can publish releases, earn payouts, and build booklets.
            You can turn on both capabilities later from account settings.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <form action={assignRole.bind(null, "CREATOR")}>
            <button
              type="submit"
              className="group w-full rounded-xl border-2 border-neutral-200 p-6 text-left transition-colors hover:border-fuchsia-400 hover:bg-fuchsia-50"
            >
              <div className="mb-3 text-3xl">🎨</div>
              <div className="font-semibold group-hover:text-fuchsia-700">
                Publish releases
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Organize your work into releases, publish them into cycles, and
                earn from booklet demand.
              </p>
            </button>
          </form>
          <form action={assignRole.bind(null, "COLLECTOR")}>
            <button
              type="submit"
              className="group w-full rounded-xl border-2 border-neutral-200 p-6 text-left transition-colors hover:border-fuchsia-400 hover:bg-fuchsia-50"
            >
              <div className="mb-3 text-3xl">📬</div>
              <div className="font-semibold group-hover:text-fuchsia-700">
                Build booklets
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Follow artists, select releases, and assemble a booklet that
                matches your taste.
              </p>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
