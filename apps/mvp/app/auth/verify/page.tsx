export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-500/10 text-3xl">
          ✉️
        </div>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a magic link to your inbox. Click it to sign in — no password
          needed.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Didn&apos;t receive it? Check your spam folder or{" "}
          <a href="/auth/sign-in" className="text-fuchsia-600 hover:underline">
            try again
          </a>
          .
        </p>
      </div>
    </main>
  );
}
