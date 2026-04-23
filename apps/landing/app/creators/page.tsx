"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ArtistPrototype } from "@/components/ArtistPrototype";
import { TrustBlock } from "@/components/TrustBlock";
import { FAQ } from "@/components/FAQ";
import { WaitlistForm } from "@/components/WaitlistForm";
import { PostSignupCard } from "@/components/PostSignupCard";
import { Footer } from "@/components/Footer";
import { HowItWorks } from "@/components/HowItWorks";
import { Button } from "@/components/ui/Button";
import { TALLY_FORMS_URLS } from "@/lib/constants";
import { trackQuestionnaireOpen } from "@/lib/analytics";

const CREATOR_HERO_IMAGES = [
  "/hero-artists/hero05.png",
  "/hero-artists/hero06.png",
  "/hero-artists/hero08.jpeg",
  "/hero-artists/hero03.webp",
  "/hero-artists/hero04.png",
];

const CREATOR_CONTENT = {
  howItWorks: [
    {
      title: "Upload",
      description:
        "Upload curated digital art pieces to the platform monthly (deadline: 15th)",
    },
    {
      title: "We Print & Ship",
      description:
        "We partner with established POD providers to print your booklet and ship it to subscribers worldwide",
    },
    {
      title: "Subscribers Receive",
      description:
        "Your existing and new subscribers receive your printed booklet at their doorstep",
    },
    {
      title: "You Get Paid",
      description:
        "Receive monthly payouts based on your subscriber count, with transparent revenue split",
    },
  ],
  benefits: [
    "Monetize your existing followers on Civitai, Instagram, etc.",
    "Gain new subscribers through platform's 'explore other creators' feature",
    "Zero operational overhead—we handle printing, shipping, and fulfillment via POD partners",
    "Distribute exclusive digital art pieces to your subscriber base monthly",
    "Predictable monthly income tied to your subscriber count",
  ],
  faqs: [
    {
      question: "How do my existing followers become subscribers?",
      answer:
        "Share your subscription link on Civitai, Instagram, and other platforms. Your existing followers can subscribe directly to receive your monthly booklet drops.",
    },
    {
      question: "How do I gain new subscribers?",
      answer:
        "Your profile appears in our 'explore other creators' feature, exposing you to collectors browsing the platform. This helps you reach new audiences beyond your existing follower base.",
    },
    {
      question: "What's the monthly workflow?",
      answer:
        "Upload curated digital art pieces by the 15th of each month. We handle layout, print prep, and coordinate with our POD partners to print and ship booklets to all your subscribers. You receive automated monthly payouts.",
    },
    {
      question: "Do I need to handle printing or shipping?",
      answer:
        "No. We partner with established POD providers who handle all printing, packaging, and shipping globally. You focus on creating art—we handle everything else.",
    },
    {
      question: "Do I retain rights to my artwork?",
      answer:
        "Absolutely. You retain full rights to your artwork. We only have permission to print and distribute it as part of your booklet subscription service.",
    },
  ],
};

export default function CreatorsPage() {
  const [showPostSignup, setShowPostSignup] = useState(false);
  const waitlistRef = useRef<HTMLDivElement>(null);
  const artistPrototypeRef = useRef<HTMLDivElement>(null);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const scrollToHowItWorks = () => {
    artistPrototypeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleWaitlistSuccess = () => {
    setShowPostSignup(true);
  };

  return (
    <>
      <Header activeTab="creators" onCtaClick={scrollToWaitlist} />

      <main className="relative overflow-hidden">
        <Hero
          headline="Monetize your digital art via printed booklets"
          subhead="Upload curated art monthly. We partner with established POD providers to print and ship booklets to your subscribers. You earn monthly payouts based on your subscriber count."
          cta="Learn more"
          onCtaClick={scrollToHowItWorks}
          images={CREATOR_HERO_IMAGES}
        />

        <>
          <div ref={artistPrototypeRef} />
          <ArtistPrototype />
        </>

        {/* Enhanced spacing and visual separation */}
        <div className="relative">
          <HowItWorks />
        </div>

        {/* Enhanced waitlist section with gradient and better visual hierarchy */}
        <section
          ref={waitlistRef}
          className="relative py-20 md:py-24 bg-gradient-to-br from-paper-dark via-amber-50/30 to-paper-dark overflow-hidden"
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-amber-200/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-rose-200/20 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 space-y-4">
              <h2 className="font-serif font-bold text-4xl md:text-5xl lg:text-6xl mb-6 bg-gradient-to-br from-ink via-ink to-ink/70 bg-clip-text text-transparent">
                Join Creator Waitlist
              </h2>
              <p className="text-ink/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Join our founding creator program.
                <br />
                Founding creators get preferential terms and higher revenue
                share.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-ink/5 p-8 md:p-10">
              <WaitlistForm
                audience="creator"
                onSuccess={handleWaitlistSuccess}
              />

              <hr className="my-8 border-ink/10 mx-auto max-w-[50%]" />

              <div className="mt-4 text-center">
                <h2 className="text-3xl text-ink mb-2 ">
                  Help us shape the product by answering a few quick questions.
                </h2>
                <Link
                  href={TALLY_FORMS_URLS.creators}
                  onClick={() => trackQuestionnaireOpen("creator")}
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
            </div>
          </div>
        </section>

        <div className="relative py-8 md:py-12">
          <FAQ items={CREATOR_CONTENT.faqs} />
        </div>
      </main>

      <Footer />

      {showPostSignup && (
        <PostSignupCard
          audience="creator"
          onDismiss={() => setShowPostSignup(false)}
        />
      )}
    </>
  );
}
