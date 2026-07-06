import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { claimCollection } from "@/lib/collect/actions";
import { getCollectionView } from "@/lib/collect/ingest-service";
import { formatEur, magazinePriceCents } from "@/lib/collect/pricing";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Print your magazine — PrintFeed",
};

export default async function PrintPage({ params }: Props) {
  const { token } = await params;
  const collection = await getCollectionView(token);
  if (!collection) notFound();

  const session = await auth();
  const isAuthed = Boolean(session?.user?.id);
  const covers = collection.groups.flatMap((g) => g.items).slice(0, 4);
  const price = formatEur(magazinePriceCents(collection.itemCount));
  const ship = claimCollection.bind(null, token);
  const activated = collection.ownerUserId && isAuthed;
  const signInUrl = `/auth/sign-in?callbackUrl=${encodeURIComponent(`/c/${token}/print`)}`;

  return (
    <main className="min-h-screen bg-beige-50 px-4 py-10">
      <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
        {/* Magazine mockup */}
        <div className="flex items-center justify-center">
          <div className="relative aspect-[3/4] w-full max-w-xs rotate-[-2deg] overflow-hidden rounded-md bg-white shadow-2xl ring-1 ring-black/5">
            {covers[0] ? (
              <Image
                src={covers[0].url}
                alt="Magazine cover"
                fill
                sizes="320px"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-xs font-medium tracking-widest text-white/80">
                PRINTFEED
              </p>
              <p className="text-lg font-semibold text-white">
                Your Collection
              </p>
            </div>
          </div>
        </div>

        {/* Order panel */}
        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium text-fuchsia-600">
            Print as magazine
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Get your collection shipped
          </h1>
          <p className="mt-3 text-beige-700">
            {collection.itemCount}{" "}
            {collection.itemCount === 1 ? "piece" : "pieces"} from{" "}
            {collection.artistCount}{" "}
            {collection.artistCount === 1 ? "artist" : "artists"}, printed as a
            perfect-bound A5 magazine and mailed to your door.
          </p>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-3xl font-semibold">{price}</span>
            <span className="text-sm text-beige-600">
              incl. printing &amp; shipping
            </span>
          </div>

          {activated ? (
            <div className="mt-6 rounded-xl border border-jade-300 bg-jade-50 p-4">
              <p className="font-medium text-jade-800">You&apos;re in! 🎉</p>
              <p className="mt-1 text-sm text-jade-700">
                Your magazine is queued for printing. We&apos;ll email shipping
                updates. Every artist inside earns a share of the print margin.
              </p>
            </div>
          ) : isAuthed ? (
            <form action={ship} className="mt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full bg-fuchsia-600 hover:bg-fuchsia-700"
              >
                Confirm &amp; ship my magazine
              </Button>
            </form>
          ) : (
            <div className="mt-6 space-y-3">
              <Button
                asChild
                size="lg"
                className="w-full bg-fuchsia-600 hover:bg-fuchsia-700"
              >
                <Link href={signInUrl}>Activate to ship →</Link>
              </Button>
              <p className="text-center text-xs text-beige-600">
                Free to start. Activate a PrintFeed account to order and ship.
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-2 overflow-x-auto">
            {covers.map((c) => (
              <div
                key={c.id}
                className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded bg-beige-100"
              >
                <Image
                  src={c.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          <Link
            href={`/c/${token}`}
            className="mt-6 text-sm text-ocean-600 hover:underline"
          >
            ← Back to your collection
          </Link>
        </div>
      </div>
    </main>
  );
}
