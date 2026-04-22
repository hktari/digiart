"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { ArtistProfile } from "@/components/ArtistProfile";
import { SimilarArtists } from "@/components/SimilarArtists";
import { CollectorFlowSteps } from "@/components/CollectorFlowSteps";
import {
  BookletCustomizer,
  BookletConfig,
} from "@/components/BookletCustomizer";
import { FAQ } from "@/components/FAQ";
import { WaitlistForm } from "@/components/WaitlistForm";
import { PostSignupCard } from "@/components/PostSignupCard";
import { Footer } from "@/components/Footer";
import {
  COLLECTOR_CONTENT,
  TALLY_FORMS_URLS,
  SAMPLE_ARTISTS,
} from "@/lib/constants";
import { NavigationButtons } from "@/components/NavigationButtons";
import { Button } from "@/components/ui/Button";
import { trackQuestionnaireOpen } from "@/lib/analytics";

export default function CollectorsPage() {
  const [showPostSignup, setShowPostSignup] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [bookletConfig, setBookletConfig] = useState<BookletConfig | null>(
    null,
  );
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([]);
  const [showArtistWindow, setShowArtistWindow] = useState(true);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubscribe = () => {
    handleNext();
  };

  const handleExplore = (artistId: string) => {
    // Add artist to favorites if not already there
    if (!favoriteArtists.includes(artistId)) {
      setFavoriteArtists((prev) => [...prev, artistId]);
    } else {
      // Remove artist from favorites
      setFavoriteArtists((prev) => prev.filter((id) => id !== artistId));
    }
  };

  const handleCustomize = (config: BookletConfig) => {
    setBookletConfig(config);
    handleNext();
  };

  const handleWaitlistSuccess = () => {
    setShowPostSignup(true);
  };

  const toggleFavoriteArtist = (artistId: string) => {
    setFavoriteArtists((prev) =>
      prev.includes(artistId)
        ? prev.filter((id) => id !== artistId)
        : [...prev, artistId],
    );
  };

  const handleArtistSelect = (artistId: string) => {
    // Navigate to the artist's profile step
    const artistIndex = SAMPLE_ARTISTS.findIndex((a) => a.id === artistId);
    if (artistIndex > 0) {
      // If it's not the featured artist, switch to similar artists step
      setCurrentStep(2);
    } else {
      // If it's the featured artist, go to profile step
      setCurrentStep(1);
    }
  };

  const scrollToWaitlist = () => {
    setCurrentStep(4);
  };

  const featuredArtist = SAMPLE_ARTISTS[3];
  const similarArtists = SAMPLE_ARTISTS.filter(
    (artist) => artist.id !== featuredArtist.id,
  );

  return (
    <>
      <Header
        activeTab="collectors"
        onCtaClick={scrollToWaitlist}
      />

      <main className="bg-paper min-h-screen">
        {/* Flow Progress Indicator */}
        <div className="md:sticky md:top-20 z-40 bg-paper/95 backdrop-blur-sm border-b border-ink/5">
          <CollectorFlowSteps currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="min-h-[calc(100vh-300px)]">
          {/* Step 1: Subscribe to Artist */}
          {currentStep === 1 && (
            <div>
              <ArtistProfile
                artist={featuredArtist}
                onSubscribe={handleSubscribe}
              />
              <NavigationButtons
                currentStep={currentStep}
                totalSteps={4}
                onPrevious={handlePrevious}
                onNext={handleNext}
                showPrevious={false}
              />
            </div>
          )}

          {/* Step 2: Explore Similar Artists */}
          {currentStep === 2 && (
            <div>
              <SimilarArtists
                artists={similarArtists}
                onArtistClick={handleExplore}
                favoriteArtists={favoriteArtists}
              />
              <NavigationButtons
                currentStep={currentStep}
                totalSteps={4}
                onPrevious={handlePrevious}
                onNext={handleNext}
              />
            </div>
          )}

          {/* Step 3: Customize Booklet */}
          {currentStep === 3 && (
            <section className="py-16 md:py-24 bg-paper">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <BookletCustomizer onComplete={handleCustomize} />
                <NavigationButtons
                  currentStep={currentStep}
                  totalSteps={4}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  className="mt-8"
                />
              </div>
            </section>
          )}

          {/* Step 4: Subscribe / Waitlist */}
          {currentStep === 4 && (
            <section className="py-16 md:py-24 bg-paper-dark min-h-[calc(100vh-300px)] flex flex-col justify-center">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-5xl  text-ink mb-4 text-balance">
                    Interested in the product?
                  </h2>
                  <p className="text-ink/60 text-lg md:text-xl font-body max-w-2xl mx-auto leading-relaxed">
                    Join the waitlist to be notified when the platform launches.
                  </p>
                </div>
                <WaitlistForm
                  audience="collector"
                  onSuccess={handleWaitlistSuccess}
                />

                <hr className="my-8 border-ink/10 mx-auto max-w-[50%]" />

                <div className="mt-4 text-center">
                  <h2 className="text-3xl text-ink mb-2 ">
                    Help us shape the product by answering a few quick
                    questions.
                  </h2>
                  <Link
                    href={TALLY_FORMS_URLS.collectors}
                    onClick={() => trackQuestionnaireOpen("collector")}
                    className="inline-flex items-center gap-2 text-ink hover:text-ink/80 transition-colors mt-4"
                  >
                    <Button
                      className="flex gap-1 items-center"
                      variant="tertiary"
                    >
                      Open Questionnaire
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>

                {bookletConfig && (
                  <div className="mt-8 p-6 bg-paper rounded-lg border border-ink/10">
                    <p className="text-sm text-ink/60 font-body text-center">
                      Your customization:{" "}
                      <span className="font-medium text-ink">
                        {bookletConfig.style}
                      </span>{" "}
                      style
                    </p>
                  </div>
                )}

                {/* Minimal FAQ */}
                <div className="mt-16 border-t border-ink/10 bg-paper-400">
                  <FAQ items={COLLECTOR_CONTENT.faqs.slice(0, 3)} />
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
      {showPostSignup && (
        <PostSignupCard
          audience="collector"
          onDismiss={() => setShowPostSignup(false)}
        />
      )}
    </>
  );
}
