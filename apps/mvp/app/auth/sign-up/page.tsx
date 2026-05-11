import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
      <Card className="max-w-lg w-full text-center">
        <CardHeader className="space-y-3">
          <Badge variant="secondary" className="mx-auto">
            Coming soon
          </Badge>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Sign up with your email to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground pt-2">
            Already have an account?{" "}
            <a href={signInHref} className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
