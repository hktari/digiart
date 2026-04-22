"use client";

import React from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Award, Users, Headphones } from "lucide-react";

export function TrustBlock() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section className="py-16 md:py-24 bg-paper relative overflow-hidden">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h2 className="font-serif font-bold text-3xl md:text-4xl mb-4">
              Founding Creator Program
            </h2>
            <p className="text-ink/70 text-lg leading-relaxed">
              Be part of our launch cohort and receive exclusive benefits
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="relative"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-teal/5 to-teal/10 rounded-2xl blur-xl"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.7, 0.5],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-teal/20 shadow-xl p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Award,
                    title: "Higher Revenue Share",
                    description: "Preferential terms for early adopters",
                  },
                  {
                    icon: Users,
                    title: "White-Glove Onboarding",
                    description: "Personalized setup and guidance",
                  },
                  {
                    icon: Headphones,
                    title: "Priority Support",
                    description: "Direct access to our team",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    className="text-center group"
                  >
                    <motion.div
                      whileHover={{
                        scale: 1.1,
                        rotate: 5,
                      }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-teal/20 to-teal/10 mb-4 group-hover:shadow-lg group-hover:shadow-teal/20 transition-shadow"
                    >
                      <item.icon className="w-8 h-8 text-teal" />
                    </motion.div>
                    <h3 className="font-serif font-semibold text-lg mb-2 group-hover:text-teal transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-ink/70 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
