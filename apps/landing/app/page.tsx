"use client";

import { Header } from "@/components/Header";
import { useScrollTracking } from "@/hooks/useScrollTracking";
import { trackCtaClick, trackCtaViewed } from "@/lib/analytics";
import { ScrollCarousel } from "@/components/ScrollCarousel";
import { Button } from "@/components/ui/Button";
import { BlurFade } from "@/components/ui/blur-fade";
import { ScrollArrowIndicator } from "@/components/ui/scroll-arrow-indicator";
import { VignetteOverlay } from "@/components/ui/vignette-overlay";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect } from "react";

const BOOKLET_SLIDES_ALTERNATIVE = [
  {
    image: "/booklet-slideshow/02/01.png",
    title: "",
  },
  {
    image: "/booklet-slideshow/02/02.png",
    title: "Personalized and Curated",
  },
  {
    image: "/booklet-slideshow/02/03.png",
    title: "Art Collections",
  },
  {
    image: "/booklet-slideshow/02/04.png",
    title: "Delivered Monthly",
  },
  {
    image: "/booklet-slideshow/02/05.png",
    title: "To Your Home",
  },
];

const BOOKLET_SLIDES = [
  {
    image: "/booklet-slideshow/01/01.png",
    title: "",
  },
  {
    image: "/booklet-slideshow/01/02.png",
    title: "Personalized and Curated",
  },
  {
    image: "/booklet-slideshow/01/03.png",
    title: "Art Collections",
  },
  {
    image: "/booklet-slideshow/01/04.png",
    title: "Delivered Monthly",
  },
  {
    image: "/booklet-slideshow/01/05.png",

    title: "To Your Home",
  },
];

export default function Home() {
  useScrollTracking();
  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaViewedRef = useRef(false);

  useEffect(() => {
    if (!ctaRef.current || ctaViewedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !ctaViewedRef.current) {
            ctaViewedRef.current = true;
            trackCtaViewed();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(ctaRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCtaClick = (destination: "creators" | "collectors") => {
    trackCtaClick(destination);
  };

  return (
    <main className="min-h-screen bg-beige-50 relative">
      <div className="hidden sm:block">
        <Header activeTab="collectors" showNavigation={false} sticky={false} />
      </div>
      <div className="flex justify-center sm:hidden absolute top-10 left-0 right-0 z-20">
        <Image
          src="/logo.png"
          alt="Logo"
          width={256}
          height={256}
          className="h-24 w-auto"
          priority
        />
      </div>

      <ScrollCarousel slides={BOOKLET_SLIDES_ALTERNATIVE} />

      <VignetteOverlay />

      <section className="min-h-screen flex flex-col items-center gap-6 justify-start sm:justify-center px-4 py-5 sm:py-20 bg-beige-texture relative">
        <div className="sm:absolute top-10 left-0 right-0 flex justify-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={168}
            height={168}
            className="h-28 sm:h-42 w-auto"
            priority
          />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6 text-ink leading-relaxed">
            <BlurFade
              delay={0.3}
              duration={0.5}
              as="span"
              className="inline-block"
            >
              Connect
            </BlurFade>{" "}
            <BlurFade
              delay={0.6}
              duration={0.5}
              as="span"
              className="inline-block"
            >
              digital art creators and collectors via
            </BlurFade>{" "}
            <BlurFade
              delay={0.9}
              duration={0.5}
              as="span"
              className="inline-block"
            >
              printed
            </BlurFade>{" "}
            <BlurFade delay={1.2} duration={0.5} as="div">
              subscription-based booklets
            </BlurFade>
          </h1>

          <BlurFade delay={1.5} duration={0.5}>
            <hr className="sm:my-8 w-1/6 mx-auto" />
          </BlurFade>
          <div
            ref={ctaRef}
            className="flex flex-col sm:flex-row gap-8 justify-center items-center pt-8"
          >
            <div className="text-center">
              <BlurFade delay={1.5} duration={0.5}>
                <Link
                  href="/creators"
                  onClick={() => handleCtaClick("creators")}
                >
                  <Button
                    variant="primary"
                    size="lg"
                    className="min-w-[240px] text-xl py-6 rounded"
                  >
                    For Creators
                  </Button>
                </Link>
              </BlurFade>
            </div>

            <div className="text-center">
              <BlurFade delay={1.5} duration={0.5}>
                <Link
                  href="/collectors"
                  onClick={() => handleCtaClick("collectors")}
                >
                  <Button
                    variant="secondary"
                    size="lg"
                    className="min-w-[240px] text-xl py-6 rounded"
                  >
                    For Collectors
                  </Button>
                </Link>
              </BlurFade>
            </div>
          </div>
        </div>

        <ScrollArrowIndicator />
      </section>
    </main>
  );
}
