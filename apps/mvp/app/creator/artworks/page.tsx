import { redirect } from "next/navigation";
import { ArtworksList } from "@/components/artworks-list";
import { getCreatorArtworks } from "@/lib/actions/artworks";
import { auth } from "@/lib/auth";

export default async function CreatorArtworksPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const artworks = await getCreatorArtworks();

  return <ArtworksList artworks={artworks} />;
}
