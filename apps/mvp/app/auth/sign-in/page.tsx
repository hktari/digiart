import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink } from "@/lib/actions/auth";
import { AnalyticsEvents, trackAnonymousEvent } from "@/lib/analytics/events";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
    redirect?: string;
  }>;
}) {
  const { error, callbackUrl: callbackUrlParam, redirect } = await searchParams;
  const callbackUrl = callbackUrlParam ?? redirect;

  // Track sign-in started
  void trackAnonymousEvent(AnalyticsEvents.AUTH_SIGNIN_STARTED, {
    pathname: "/auth/sign-in",
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            We&apos;ll send you a magic link to your email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Please enter a valid email address.
            </p>
          )}
          <form action={sendMagicLink} className="space-y-4">
            {callbackUrl && (
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" className="w-full">
              Send magic link
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
