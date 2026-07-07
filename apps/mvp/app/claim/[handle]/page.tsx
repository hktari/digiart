import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { claimCreatorLead } from "@/lib/collect/actions";
import { getClaimView } from "@/lib/collect/ingest-service";
import { creatorEarningsCents, formatEur } from "@/lib/collect/pricing";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const clean = handle.replace(/^@/, "");
  return {
    title: `@${clean} — your art is being collected on PrintFeed`,
    description:
      "Collectors are printing your Threads art as magazines. Claim your page to get paid.",
  };
}

export default async function ClaimPage({ params }: Props) {
  const { handle } = await params;
  const claim = await getClaimView(handle);
  if (!claim) notFound();

  const session = await auth();
  const isAuthed = Boolean(session?.user?.id);
  const earnings = formatEur(creatorEarningsCents(claim.collectorCount));
  const claimAction = claimCreatorLead.bind(null, claim.handle);
  const signInUrl = `/auth/sign-in?callbackUrl=${encodeURIComponent(`/claim/${claim.handle}`)}`;

  return (
    <main className="min-h-screen bg-beige-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium text-ocean-600">
          PrintFeed for artists
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-beige-900">
          @{claim.handle}, your work is being collected
        </h1>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Stat value={String(claim.itemCount)} label="pieces collected" />
          <Stat value={String(claim.collectorCount)} label="collectors" />
          <Stat value={earnings} label="pending earnings" accent />
        </div>

        <div className="mt-8 rounded-2xl border border-fuchsia-200 bg-white p-6">
          {isAuthed ? (
            <>
              <p className="text-lg font-medium text-jade-800">
                Nice to meet you 👋
              </p>
              <p className="mt-1 text-beige-700">
                We&apos;ve reserved your earnings. Finish setting up your
                creator profile and connect PayPal to get paid whenever a
                collector prints your work.
              </p>
              <form action={claimAction} className="mt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="bg-fuchsia-600 hover:bg-fuchsia-700"
                >
                  Set up my creator page
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-beige-900">
                You&apos;ve earned {earnings} — and you didn&apos;t even know
                it.
              </p>
              <p className="mt-1 text-beige-700">
                {claim.collectorCount}{" "}
                {claim.collectorCount === 1
                  ? "collector has"
                  : "collectors have"}{" "}
                added your art to a print magazine. Claim your page to collect
                your share of the print margin — no upfront cost.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-4 bg-fuchsia-600 hover:bg-fuchsia-700"
              >
                <Link href={signInUrl}>Claim your page &amp; get paid →</Link>
              </Button>
            </>
          )}
        </div>

        <h2 className="mt-10 mb-3 text-lg font-medium text-beige-900">
          Your collected work
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {claim.items.map((item) => (
            <div
              key={item.id}
              className="relative aspect-[3/4] overflow-hidden rounded-lg bg-beige-100"
            >
              <Image
                src={item.url}
                alt={`Artwork by @${claim.handle}`}
                fill
                sizes="(max-width: 640px) 33vw, 25vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-beige-200 bg-white p-4 text-center">
      <p
        className={`text-2xl font-semibold ${accent ? "text-fuchsia-600" : "text-beige-900"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-beige-600">{label}</p>
    </div>
  );
}
