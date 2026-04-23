import Link from "next/link";
import { TALLY_FORMS_URLS } from "@/lib/constants";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default async function QuestionnairePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  const formUrl = TALLY_FORMS_URLS[type as keyof typeof TALLY_FORMS_URLS];

  // Validate the type
  if (!formUrl) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-paper flex flex-1 flex-col">
      <Header activeTab="creators" showNavigation={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-1 flex-col items-center justify-start">
        <div className="mb-8 text-center">
          <h1 className="font-serif font-bold text-3xl md:text-5xl mb-5">
            Your Opinion Matters
          </h1>
          <p className="text-ink/70 text-lg">
            Help us design the perfect booklet experience
          </p>
        </div>
        <Link
          href={formUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-ink hover:text-ink/80 transition-colors mt-4"
        >
          <Button className="flex gap-1 items-center" variant="tertiary">
            Open Questionnaire
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      <Footer />
    </div>
  );
}
