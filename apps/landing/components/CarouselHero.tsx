"use client";

import { Carousel } from "@/components/ui/carousel";
import { Button } from "@/components/ui/Button";

interface CarouselHeroProps {
  onCreatorClick: () => void;
  onCollectorClick: () => void;
}

export function CarouselHero({
  onCreatorClick,
  onCollectorClick,
}: CarouselHeroProps) {
  const slideData = [
    {
      title: "Curated Art Delivered Monthly",
      button: "Explore",
      src: "/booklet-slideshow/01.png",
    },
    {
      title: "Discover Emerging Creators",
      button: "Explore",
      src: "/booklet-slideshow/02.png",
    },
    {
      title: "Build Your Collection",
      button: "Explore",
      src: "/booklet-slideshow/03.png",
    },
    {
      title: "Support Creative Talent",
      button: "Explore",
      src: "/booklet-slideshow/04.png",
    },
    {
      title: "Art That Inspires",
      button: "Explore",
      src: "/booklet-slideshow/05.png",
    },
    {
      title: "Your Monthly Art Journey",
      button: "Explore",
      src: "/booklet-slideshow/06.png",
    },
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-paper to-paper-dark py-20 px-4">
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h1 className="font-serif font-bold text-4xl md:text-5xl lg:text-6xl mb-6 text-ink">
            Art Subscription Platform
          </h1>
          <p className="text-lg md:text-xl text-ink/70 max-w-2xl mx-auto mb-8">
            Connect creators with collectors through beautifully curated monthly
            booklets
          </p>
        </div>

        <div className="relative overflow-hidden w-full h-full py-20">
          <Carousel slides={slideData} />
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-16">
          <div className="text-center">
            <Button
              onClick={onCreatorClick}
              variant="primary"
              size="lg"
              className="min-w-[200px]"
            >
              For Creators
            </Button>
            <p className="text-sm text-ink/60 mt-2">Showcase your work</p>
          </div>

          <div className="text-center">
            <Button
              onClick={onCollectorClick}
              variant="secondary"
              size="lg"
              className="min-w-[200px]"
            >
              For Collectors
            </Button>
            <p className="text-sm text-ink/60 mt-2">Discover new creators</p>
          </div>
        </div>
      </div>
    </section>
  );
}
