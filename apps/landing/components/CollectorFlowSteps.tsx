"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart, Users, Palette, CheckCircle } from "lucide-react";

interface FlowStep {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
}

interface CollectorFlowStepsProps {
  currentStep: number;
}

const stepProgressConfig = {
  1: 0, // Follow Artist - 0% progress
  2: 38.33, // Explore Similar - 33.33% progress
  3: 60.67, // Customize - 66.67% progress
  4: 100, // Subscribe - 100% progress
} as const;

export function CollectorFlowSteps({ currentStep }: CollectorFlowStepsProps) {
  const steps: FlowStep[] = [
    {
      id: "follow",
      number: 1,
      title: "Follow Artist",
      description: "Discover and follow your favorite creators",
      icon: <Heart className="w-5 h-5" />,
      active: currentStep >= 1,
    },
    {
      id: "explore",
      number: 2,
      title: "Explore Similar",
      description: "Find more artists you'll love",
      icon: <Users className="w-5 h-5" />,
      active: currentStep >= 2,
    },
    {
      id: "customize",
      number: 3,
      title: "Customize",
      description: "Personalize your booklet design",
      icon: <Palette className="w-5 h-5" />,
      active: currentStep >= 3,
    },
    {
      id: "subscribe",
      number: 4,
      title: "Subscribe",
      description: "Join the waitlist for monthly drops",
      icon: <CheckCircle className="w-5 h-5" />,
      active: currentStep >= 4,
    },
  ];

  return (
    <div className="w-full py-4 md:py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Desktop: Horizontal */}
        <div className="hidden md:flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-ink/10">
            <motion.div
              className="h-full bg-jade-400"
              initial={{ width: "0%" }}
              animate={{
                width: `${stepProgressConfig[currentStep as keyof typeof stepProgressConfig] || 0}%`,
              }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          {steps.map((step, index) => (
            <div
              key={step.id}
              className="relative flex flex-col items-center z-10"
              style={{ width: "25%" }}
            >
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-smooth ${
                  step.active
                    ? "bg-jade-400 text-paper shadow-lg"
                    : "bg-paper border-2 border-ink/10 text-ink/30"
                }`}
                initial={{ scale: 0.8 }}
                animate={{ scale: step.active ? 1 : 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                {step.icon}
              </motion.div>
              <div className="text-center">
                <div
                  className={`font-medium text-xs md:text-sm font-body mb-1 ${step.active ? "text-ink" : "text-ink/40"}`}
                >
                  {step.title}
                </div>
                <div
                  className={`text-[10px] md:text-xs font-body ${step.active ? "text-ink/60" : "text-ink/30"}`}
                >
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Vertical */}
        <div className="md:hidden space-y-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-smooth ${
                  step.active
                    ? "bg-jade-400 text-paper shadow-lg"
                    : "bg-paper border-2 border-ink/10 text-ink/30"
                }`}
              >
                <div className="w-4 h-4">{step.icon}</div>
              </div>
              <div className="flex-1 pt-0.5">
                <div
                  className={`font-medium text-sm font-body mb-0.5 ${step.active ? "text-ink" : "text-ink/40"}`}
                >
                  {step.title}
                </div>
                <div
                  className={`text-xs font-body ${step.active ? "text-ink/60" : "text-ink/30"}`}
                >
                  {step.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
