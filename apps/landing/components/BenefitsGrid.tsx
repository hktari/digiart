"use client";

import React from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Check, Star, Shield, Zap } from "lucide-react";

interface BenefitsGridProps {
  benefits: string[];
}

const benefitIcons = [Star, Shield, Zap, Check];

export function BenefitsGrid({ benefits }: BenefitsGridProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, rotateX: -10 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section className="py-16 md:py-24 bg-paper-dark relative overflow-hidden">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="font-serif font-bold text-3xl md:text-4xl text-center mb-12 md:mb-16"
        >
          Why Choose Us
        </motion.h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {benefits.map((benefit, index) => {
            const Icon = benefitIcons[index % benefitIcons.length];
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{
                  scale: 1.03,
                  y: -5,
                  boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.15)",
                }}
                className="bg-paper rounded-xl p-6 border border-ink/5 shadow-sm hover:shadow-lg hover:border-teal/30 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-teal to-teal/80 flex items-center justify-center mt-0.5 shadow-md group-hover:shadow-lg group-hover:shadow-teal/20 transition-shadow"
                  >
                    <Icon className="w-5 h-5 text-paper" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-ink leading-relaxed font-medium">
                      {benefit}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
