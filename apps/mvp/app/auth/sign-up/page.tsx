type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  const signInHref = callbackUrl
    ? `/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/auth/sign-in";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-3">
        <span className="inline-block rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-medium text-fuchsia-700">
          Coming soon
        </span>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-neutral-500">
          Sign up with your email to get started.
        </p>
        <p className="text-sm text-neutral-500 pt-4">
          Already have an account?{" "}
          <a href={signInHref} className="text-fuchsia-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
