import { sendMagicLink } from "@/lib/actions/auth";
import { AnalyticsEvents, trackAnonymousEvent } from "@/lib/analytics/events";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  // Track sign-in started
  void trackAnonymousEvent(AnalyticsEvents.AUTH_SIGNIN_STARTED, {
    pathname: "/auth/sign-in",
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-neutral-500">
            We&apos;ll send you a magic link to your email.
          </p>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Please enter a valid email address.
          </p>
        )}
        <form action={sendMagicLink} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-fuchsia-600 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
          >
            Send magic link
          </button>
        </form>
        <p className="text-center text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <a
            href={
              callbackUrl
                ? `/auth/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : "/auth/sign-up"
            }
            className="text-fuchsia-600 hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}
