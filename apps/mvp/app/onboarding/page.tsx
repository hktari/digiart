import Image from "next/image";
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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 " />

      <div className="relative z-10 w-full max-w-3xl">
        <div className="space-y-12 mb-5 md:mb-12">
          <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both text-center duration-700">
            <h1 className="mb-3 bg-gradient-to-r from-fuchsia-600 via-foreground to-ocean bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              Hey there fellow art lover
            </h1>
            <p className="text-lg text-muted-foreground">lets get you setup</p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both text-center duration-700 delay-150">
            <p className="text-2xl font-bold uppercase tracking-wider">
              I'd like to
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <form
            action={assignRole.bind(null, "CREATOR")}
            className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both duration-700 delay-300 group"
          >
            <button
              type="submit"
              className="relative flex w-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card text-left shadow-sm transition-all duration-500 active:scale-[0.98] sm:hover:-translate-y-2 sm:hover:border-fuchsia-400 sm:hover:shadow-2xl sm:aspect-[4/5]"
            >
              <div className="relative h-40 w-full overflow-hidden sm:absolute sm:inset-0 sm:h-full">
                <Image
                  src="/onboarding-creator.png"
                  alt="Upload art and earn"
                  fill
                  className="object-cover transition-all duration-700 sm:opacity-20 sm:group-hover:opacity-100 sm:group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-100 transition-opacity duration-500 sm:group-hover:opacity-100" />
              </div>

              <div className="relative z-20 flex flex-1 flex-col justify-between p-5 sm:absolute sm:inset-0 sm:p-6 sm:transition-opacity sm:duration-500 sm:group-hover:opacity-0">
                <div>
                  <div className="mb-3 flex items-center gap-2 sm:mb-4">
                    <span className="flex h-2 w-2 rounded-full bg-fuchsia" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-600">
                      Creator
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold leading-tight text-foreground sm:mb-3 sm:text-2xl">
                    Upload my art and earn from platform revenue
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Share your creative work with the world and get rewarded
                    when collectors build booklets featuring your art.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between sm:block sm:mt-0">
                  <span className="text-xs font-medium text-fuchsia-600 sm:hidden">
                    Tap to get started →
                  </span>
                  <span className="hidden text-xs font-medium text-fuchsia-600 sm:block">
                    Click to get started →
                  </span>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 hidden p-6 sm:block sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                  Become a Creator →
                </span>
              </div>
            </button>
          </form>

          <form
            action={assignRole.bind(null, "COLLECTOR")}
            className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both duration-700 delay-500 group"
          >
            <button
              type="submit"
              className="relative flex w-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card text-left shadow-sm transition-all duration-500 active:scale-[0.98] sm:hover:-translate-y-2 sm:hover:border-ocean sm:hover:shadow-2xl sm:aspect-[4/5]"
            >
              <div className="relative h-40 w-full overflow-hidden sm:absolute sm:inset-0 sm:h-full">
                <Image
                  src="/onboarding-collector.png"
                  alt="Collect art booklets"
                  fill
                  className="object-cover transition-all duration-700 sm:opacity-20 sm:group-hover:opacity-100 sm:group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-100 transition-opacity duration-500 sm:group-hover:opacity-100" />
              </div>

              <div className="relative z-20 flex flex-1 flex-col justify-between p-5 sm:absolute sm:inset-0 sm:p-6 sm:transition-opacity sm:duration-500 sm:group-hover:opacity-0">
                <div>
                  <div className="mb-3 flex items-center gap-2 sm:mb-4">
                    <span className="flex h-2 w-2 rounded-full bg-ocean" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ocean-600">
                      Collector
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold leading-tight text-foreground sm:mb-3 sm:text-2xl">
                    View and collect digital art in printed booklet format
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Discover amazing artists, curate your favorite pieces, and
                    receive a beautifully printed booklet delivered to your
                    door.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between sm:block sm:mt-0">
                  <span className="text-xs font-medium text-ocean-600 sm:hidden">
                    Tap to get started →
                  </span>
                  <span className="hidden text-xs font-medium text-ocean-600 sm:block">
                    Click to get started →
                  </span>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 hidden p-6 sm:block sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                  Become a Collector →
                </span>
              </div>
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          You can always switch or enable both modes later from your account
          settings
        </p>
      </div>
    </main>
  );
}
