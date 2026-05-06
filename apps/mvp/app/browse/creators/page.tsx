import { getAllPublishedCreators, getAllTags } from "@/lib/actions/browse";
import { BrowseCreatorsClient } from "./browse-creators-client";

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
    <BrowseCreatorsClient initialCreators={creators} tags={tags} tag={tag} />
  );
}
