"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface Slide {
  image: string;
  title?: string;
}

interface ScrollCarouselProps {
  slides: Slide[];
  bufferHeight?: string;
}

export function ScrollCarousel({
  slides,
  bufferHeight = "50vh",
}: ScrollCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const scrollStart = -rect.top;
      const slideIndex = Math.round(scrollStart / viewportHeight);

      // Allow index to go beyond last slide to track "beyond" state
      const currentIndex = Math.max(0, slideIndex);
      setCurrentSlide(currentIndex);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [slides.length]);

  return (
    <div
      ref={containerRef}
      className="w-full snap-y snap-mandatory"
      style={{ height: `calc(${slides.length * 100}vh + ${bufferHeight})` }}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className="sticky top-0 left-0 w-full h-screen snap-start snap-always flex flex-col items-center justify-center overflow-hidden px-4"
        >
          <div
            className=" w-full h-full flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out relative"
            style={{
              opacity: currentSlide === index ? 1 : 0,
            }}
          >
            <div className="flex-1 w-full flex items-center justify-center ">
              <div className="relative">
                <AnimatePresence mode="wait">
                  {slide.title && currentSlide === index && (
                    <motion.h2
                      key={`${index}-${slide.title}`}
                      initial={{ opacity: 0, y: -50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -50 }}
                      transition={{
                        duration: 1.2,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="z-20 text-4xl md:text-4xl lg:text-5xl text-ink mb-6 md:mb-8 text-center max-w-4xl fixed top-15 left-1/2 -translate-x-1/2 leading-tight "
                    >
                      {slide.title}
                    </motion.h2>
                  )}
                </AnimatePresence>
                <Image
                  src={slide.image}
                  alt={slide.title || `Booklet page ${index + 1}`}
                  width={1200}
                  height={1600}
                  className="max-w-full max-h-full object-contain"
                  priority={index === 0}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
