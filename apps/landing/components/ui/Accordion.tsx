"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface AccordionItemProps {
  question: string;
  answer: string;
  index?: number;
}

export function AccordionItem({ question, answer, index }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index || 0) * 0.1, duration: 0.5 }}
      className="border-b border-ink/10 last:border-b-0"
    >
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ x: 4 }}
        className="w-full py-4 flex items-center justify-between text-left hover:text-vermilion transition-colors"
      >
        <span className="font-serif font-semibold text-lg pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 flex-shrink-0" />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <motion.p
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-ink/80 leading-relaxed pb-4"
            >
              {answer}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface AccordionProps {
  items: AccordionItemProps[];
}

export function Accordion({ items }: AccordionProps) {
  return (
    <div className="divide-y divide-ink/10">
      {items.map((item, index) => (
        <AccordionItem key={index} {...item} index={index} />
      ))}
    </div>
  );
}
