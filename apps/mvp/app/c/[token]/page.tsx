import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  removeCollectionItem,
  saveCollectionEmail,
} from "@/lib/collect/actions";
import { getCollectionView } from "@/lib/collect/ingest-service";
import { SaveCollectionForm } from "./save-collection-form";

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
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ocean-600 dark:text-ocean-400">
              Your collection
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
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

        {!collection.ownerUserId && <SaveCollectionForm action={saveEmail} />}

        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.handle}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-medium text-foreground">
                  @{group.handle}
                </h2>
                <Link
                  href={`/claim/${group.handle}`}
                  className="text-sm text-ocean-600 hover:underline dark:text-ocean-400"
                >
                  Are you this artist? →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={item.url}
                      alt={item.caption ?? `Artwork by @${group.handle}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                    <form
                      action={removeCollectionItem.bind(null, token, item.id)}
                      className="absolute right-1.5 top-1.5"
                    >
                      <button
                        type="submit"
                        aria-label="Remove from collection"
                        title="Remove"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-sm backdrop-blur-sm transition hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                          aria-hidden="true"
                        >
                          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                      </button>
                    </form>
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
