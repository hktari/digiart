"use client";

import React from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Accordion } from "./ui/Accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
}

export function FAQ({ items }: FAQProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="py-16 md:py-10 bg-paper relative overflow-hidden">
      <div ref={ref} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="font-serif font-bold text-3xl md:text-4xl text-center mb-12 md:mb-16"
        >
          Frequently Asked Questions
        </motion.h2>

        <Accordion items={items} />
      </div>
    </section>
  );
}
