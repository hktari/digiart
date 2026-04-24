import Image from "next/image";
import Link from "next/link";
import { getAllPublishedCreators, getAllTags } from "@/lib/actions/browse";

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export default async function BrowseCreatorsPage({ searchParams }: Props) {
  const { tag } = await searchParams;
  const [creators, tags] = await Promise.all([
    getAllPublishedCreators(tag),
    getAllTags(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">
            Browse Creators
          </h1>
          <p className="mt-2 text-neutral-600">
            Discover artists and subscribe to their monthly releases
          </p>
        </div>

        {tags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/browse/creators"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !tag
                    ? "bg-fuchsia-600 text-white"
                    : "bg-white text-neutral-700 border border-neutral-200 hover:border-fuchsia-300"
                }`}
              >
                All
              </Link>
              {tags.map(
                (t: {
                  slug: string;
                  name: string;
                  _count: { releaseTags: number };
                }) => (
                  <Link
                    key={t.slug}
                    href={`/browse/creators?tag=${t.slug}`}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      tag === t.slug
                        ? "bg-fuchsia-600 text-white"
                        : "bg-white text-neutral-700 border border-neutral-200 hover:border-fuchsia-300"
                    }`}
                  >
                    {t.name} ({t._count.releaseTags})
                  </Link>
                ),
              )}
            </div>
          </div>
        )}

        {creators.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-ocean-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-ocean-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">
                No creators found
              </h2>
              <p className="text-neutral-600">
                {tag
                  ? "Try selecting a different tag or view all creators"
                  : "Check back soon for new creators"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {creators.map((creator) => (
              <Link
                key={creator.id}
                href={`/creators/${creator.slug}`}
                className="bg-white rounded-lg border border-neutral-200 p-6 hover:border-fuchsia-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  {creator.avatar ? (
                    <Image
                      src={creator.avatar}
                      alt={creator.displayName}
                      width={64}
                      height={64}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-fuchsia-100 to-ocean-100 flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {creator.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neutral-900 truncate">
                      {creator.displayName}
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      {creator._count.releases}{" "}
                      {creator._count.releases === 1 ? "release" : "releases"}
                    </p>
                  </div>
                </div>
                {creator.bio && (
                  <p className="mt-4 text-sm text-neutral-600 line-clamp-3">
                    {creator.bio}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
