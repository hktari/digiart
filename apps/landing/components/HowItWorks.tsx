"use client";

import React from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Image from "next/image";

const cycleSteps = [
  {
    id: 1,
    title: "Dynamic and Curated Artwork Pool",
    description:
      "Creators handpick their best works to contribute to a shared pool utilized to generate personalized booklets for each collector.",
    image: "/how-it-works/step1-artwork-pool.png",
  },
  {
    id: 2,
    title: "Global Print & Delivery",
    description:
      "Automated on-demand printing and worldwide shipping ensures booklets reach subscribers' doorsteps anywhere.",
    image: "/how-it-works/step2-global-fulfillment.png",
  },
  {
    id: 3,
    title: "Physical to Digital",
    description:
      "Collectors use their physical booklets to engage back with the platform, providing feedback and ratings.",
    image: "/how-it-works/step3-physical-to-platform.png",
  },
  {
    id: 4,
    title: "Dynamic Subscriber Base",
    description:
      "The subscriber base is fluid—users can subscribe to max 3-5 creators at once, shifting the artwork pool for the next cycle.",
    image: "/how-it-works/step4-dynamic-community.png",
  },
];

export function HowItWorks() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <section className="py-24 md:py-40 bg-paper relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-vermilion/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tl from-amber-100/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div
        ref={ref}
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20 md:mb-28"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block mb-6"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-vermilion to-vermilion/70 flex items-center justify-center shadow-lg shadow-vermilion/20">
              <svg
                className="w-8 h-8 text-paper"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
          </motion.div>
          <h2 className="font-serif font-bold text-4xl md:text-6xl mb-6 tracking-tight">
            How it works{" "}
          </h2>
          <p className="text-ink/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            A continuous loop connecting digital creators, global fulfillment,
            and dynamic collector engagement.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative"
        >
          {/* Corner connectors with arrows - Desktop only */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none z-20">
            {/* Circular flow indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="flex items-center gap-3 text-ink/40">
                <svg
                  className="w-8 h-8 animate-spin"
                  style={{ animationDuration: "8s" }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              </div>
            </motion.div>
            {/* Arrow 1→2 (center top) */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
              className="absolute left-1/2 top-[22%] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-10 h-10 rounded-full bg-paper border-2 border-vermilion/30 flex items-center justify-center shadow-sm">
                <svg
                  className="w-7 h-7 text-vermilion"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </motion.div>

            {/* Arrow 2→3 (center right) */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
              className="absolute right-[22%] top-1/2 translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-10 h-10 rounded-full bg-paper border-2 border-vermilion/30 flex items-center justify-center shadow-sm">
                <svg
                  className="w-7 h-7 text-vermilion"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 19V5M19 12l-7 7-7-7" />
                </svg>
              </div>
            </motion.div>

            {/* Arrow 3→4 (center bottom) */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 1.6, type: "spring", stiffness: 200 }}
              className="absolute left-1/2 bottom-[22%] -translate-x-1/2 translate-y-1/2"
            >
              <div className="w-10 h-10 rounded-full bg-paper border-2 border-vermilion/30 flex items-center justify-center shadow-sm">
                <svg
                  className="w-7 h-7 text-vermilion"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </div>
            </motion.div>

            {/* Arrow 4→1 (center left) - completing the cycle */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 1.8, type: "spring", stiffness: 200 }}
              className="absolute left-[22%] top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-10 h-10 rounded-full bg-paper border-2 border-vermilion/30 flex items-center justify-center shadow-sm">
                <svg
                  className="w-7 h-7 text-vermilion"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12l7-7 7 7" />
                </svg>
              </div>
            </motion.div>
          </div>

          {cycleSteps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={`group relative aspect-[4/3] rounded-2xl md:rounded-3xl overflow-hidden md:cursor-pointer
                ${index === 0 ? "md:col-start-1 md:row-start-1" : ""}
                ${index === 1 ? "md:col-start-2 md:row-start-1" : ""}
                ${index === 2 ? "md:col-start-2 md:row-start-2" : ""}
                ${index === 3 ? "md:col-start-1 md:row-start-2" : ""}
              `}
            >
              {/* Image */}
              <Image
                src={step.image}
                alt={step.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="lazy"
              />

              {/* Gradient overlay - stronger on mobile for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/60 to-ink/20 md:from-ink/90 md:via-ink/40 md:to-transparent md:opacity-60 md:group-hover:opacity-80 transition-opacity duration-500" />

              {/* Step number badge */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={inView ? { scale: 1, rotate: 0 } : {}}
                transition={{
                  delay: 0.5 + index * 0.1,
                  type: "spring",
                  stiffness: 200,
                }}
                className="absolute top-4 left-4 md:top-6 md:left-6 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg z-10"
              >
                <span className="font-bold text-vermilion text-sm md:text-base">
                  {step.id}
                </span>
              </motion.div>

              {/* Content - always visible on mobile, hover on desktop */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6 lg:p-8">
                {/* Title - always visible */}
                <h3 className="font-serif font-bold text-lg md:text-xl lg:text-2xl text-white mb-2 transform transition-all duration-500">
                  {step.title}
                </h3>

                {/* Description - always visible on mobile, hover on desktop */}
                <div className="overflow-hidden">
                  <p className="text-white/90 md:text-white/80 text-sm md:text-base leading-relaxed transform translate-y-0 opacity-100 md:translate-y-full md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-500 md:delay-100">
                    {step.description}
                  </p>
                </div>

                {/* Hover indicator - desktop only */}
                <div className="hidden md:block absolute bottom-6 right-6 lg:bottom-8 lg:right-8 opacity-60 group-hover:opacity-0 transition-opacity duration-300">
                  <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white/60"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Animated border on hover - desktop only */}
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl border-2 border-vermilion/0 md:group-hover:border-vermilion/50 transition-colors duration-500" />

              {/* Shine effect on hover - desktop only */}
              <div className="hidden md:block absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
