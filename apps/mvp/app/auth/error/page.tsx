const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The magic link has expired or has already been used.",
  Default: "An unexpected error occurred. Please try again.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = ERROR_MESSAGES[error ?? "Default"] ?? ERROR_MESSAGES.Default;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
          ⚠️
        </div>
        <h1 className="text-2xl font-bold">Authentication error</h1>
        <p className="text-sm text-neutral-500">{message}</p>
        <a
          href="/auth/sign-in"
          className="inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-6 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 transition-colors"
        >
          Back to sign in
        </a>
      </div>
    </main>
  );
}
