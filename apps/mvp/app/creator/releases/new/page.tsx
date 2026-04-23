import { NewReleaseForm } from "@/components/new-release-form";

export default function CreatorReleaseNewPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-8">
        New release
      </h1>
      <NewReleaseForm />
    </div>
  );
}
