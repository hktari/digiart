import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCollectionEmail } from "@/lib/collect/actions";
import { getCollectionView } from "@/lib/collect/ingest-service";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Your collection — PrintFeed",
  description: "Art you collected from Threads, ready to print as a magazine.",
};

export default async function CollectionPage({ params }: Props) {
  const { token } = await params;
  const collection = await getCollectionView(token);
  if (!collection) notFound();

  const { itemCount, artistCount, groups } = collection;
  const saveEmail = saveCollectionEmail.bind(null, token);

  return (
    <main className="min-h-screen bg-beige-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ocean-600">
              Your collection
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-beige-900">
              {itemCount} {itemCount === 1 ? "piece" : "pieces"} from{" "}
              {artistCount} {artistCount === 1 ? "artist" : "artists"}
            </h1>
          </div>
          <Button
            asChild
            size="lg"
            className="bg-fuchsia-600 hover:bg-fuchsia-700"
          >
            <Link href={`/c/${token}/print`}>Print as magazine →</Link>
          </Button>
        </header>

        {!collection.ownerUserId && (
          <form
            action={saveEmail}
            className="mb-10 flex flex-col gap-2 rounded-xl border border-beige-200 bg-white p-4 sm:flex-row sm:items-center"
          >
            <label htmlFor="email" className="text-sm text-beige-700 sm:mr-2">
              Save your collection — we&apos;ll email you the link:
            </label>
            <div className="flex flex-1 gap-2">
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="flex-1"
              />
              <Button type="submit" variant="outline">
                Save
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.handle}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-medium text-beige-900">
                  @{group.handle}
                </h2>
                <Link
                  href={`/claim/${group.handle}`}
                  className="text-sm text-ocean-600 hover:underline"
                >
                  Are you this artist? →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-[3/4] overflow-hidden rounded-lg bg-beige-100"
                  >
                    <Image
                      src={item.url}
                      alt={item.caption ?? `Artwork by @${group.handle}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
