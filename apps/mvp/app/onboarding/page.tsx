import { redirect } from "next/navigation";
import { assignRole } from "@/lib/actions/roles";
import { auth } from "@/lib/auth";
import { getUserRoles } from "@/lib/roles";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const roles = await getUserRoles(session.user.id);

  if (roles.includes("CREATOR")) redirect("/creator/setup");
  if (roles.includes("COLLECTOR")) redirect("/collector/setup");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">
            Welcome! How will you use the platform?
          </h1>
          <p className="text-sm text-neutral-500">
            You can add both roles later from your account settings.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <form action={assignRole.bind(null, "CREATOR")}>
            <button
              type="submit"
              className="w-full rounded-xl border-2 border-neutral-200 p-6 text-left hover:border-fuchsia-400 hover:bg-fuchsia-50 transition-colors group"
            >
              <div className="text-3xl mb-3">🎨</div>
              <div className="font-semibold group-hover:text-fuchsia-700">
                Creator
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Upload artworks, publish monthly releases, and build your
                collector audience.
              </p>
            </button>
          </form>
          <form action={assignRole.bind(null, "COLLECTOR")}>
            <button
              type="submit"
              className="w-full rounded-xl border-2 border-neutral-200 p-6 text-left hover:border-fuchsia-400 hover:bg-fuchsia-50 transition-colors group"
            >
              <div className="text-3xl mb-3">📬</div>
              <div className="font-semibold group-hover:text-fuchsia-700">
                Collector
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Subscribe to creators and receive a curated monthly art booklet.
              </p>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
