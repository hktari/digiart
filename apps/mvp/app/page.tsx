export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Art Subscription Platform
        </h1>
        <p className="text-lg text-neutral-600">
          Monthly curated art booklets from independent creators.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/browse"
            className="inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-6 py-3 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
          >
            Browse creators
          </a>
          <a
            href="/auth/sign-in"
            className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Sign in
          </a>
        </div>
      </div>
    </main>
  );
}
