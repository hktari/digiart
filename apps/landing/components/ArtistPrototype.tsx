"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  User,
  Upload,
  Share2,
  DollarSign,
  Image as ImageIcon,
  Link as LinkIcon,
  Copy,
  TrendingUp,
  Users,
  CheckCircle2,
  Instagram,
  Globe,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const STEPS = [
  {
    id: 1,
    title: "Create Profile",
    description: "Set up your artistic identity in seconds.",
    icon: User,
    color: "fuchsia",
    gradient: "from-fuchsia-500 to-fuchsia-600",
    bgLight: "bg-fuchsia-50",
    textDark: "text-fuchsia-900",
  },
  {
    id: 2,
    title: "Upload Art",
    description: "Drop your high-res files. We handle the rest.",
    icon: Upload,
    color: "ocean",
    gradient: "from-ocean-500 to-ocean-600",
    bgLight: "bg-ocean-50",
    textDark: "text-ocean-900",
  },
  {
    id: 3,
    title: "Share Link",
    description: "Give your followers a place to subscribe.",
    icon: Share2,
    color: "jade",
    gradient: "from-jade-500 to-jade-600",
    bgLight: "bg-jade-50",
    textDark: "text-jade-900",
  },
  {
    id: 4,
    title: "Get Paid",
    description: "Earn predictable monthly recurring revenue.",
    icon: DollarSign,
    color: "vermilion",
    gradient: "from-vermilion to-orange-600",
    bgLight: "bg-orange-50",
    textDark: "text-orange-900",
  },
];

export function ArtistPrototype() {
  const [activeStep, setActiveStep] = useState(1);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-advance for the demo effect, but pause on interaction
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev === 4 ? 1 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-20 md:py-32 relative overflow-hidden bg-paper">
      {/* Background Ornaments */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent" />
      <div className="absolute -left-40 top-40 w-96 h-96 bg-fuchsia-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-40 bottom-40 w-96 h-96 bg-ocean-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-ink mb-6 text-balance">
            Monetize your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-ocean-500">
              creative
            </span>{" "}
            endevours
          </h2>
          <p className="text-lg md:text-xl text-ink/70">
            Provide a subscription experience for your fans and start earning
            predictable revenue.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Steps Navigation */}
          <div className="lg:col-span-5 space-y-4">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              const Icon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "w-full text-left p-6 rounded-2xl transition-all duration-300 border",
                    isActive
                      ? `bg-white shadow-xl border-${step.color}-200 scale-105`
                      : "bg-white/40 border-transparent hover:bg-white/60 hover:border-ink/5",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300",
                        isActive
                          ? `bg-gradient-to-br ${step.gradient} text-white shadow-lg`
                          : "bg-ink/5 text-ink/50",
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-xl font-bold mb-1 transition-colors duration-300",
                          isActive ? step.textDark : "text-ink/70",
                        )}
                      >
                        {step.id}. {step.title}
                      </h3>
                      <p
                        className={cn(
                          "text-sm transition-colors duration-300",
                          isActive ? "text-ink/80" : "text-ink/50",
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Mockup Area */}
          <div className="lg:col-span-7">
            <div className="relative aspect-square md:aspect-[4/3] w-full bg-paper-dark/50 border border-ink/10 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center p-4 md:p-8 backdrop-blur-sm">
              <AnimatePresence mode="wait">
                {activeStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-ink/5 overflow-hidden"
                  >
                    <div className="h-32 bg-gradient-to-r from-fuchsia-100 to-fuchsia-200 relative">
                      <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-full border-4 border-white bg-fuchsia-300 overflow-hidden">
                        <Image
                          src="/artists/kira-nakamura/profile.png"
                          alt="Avatar"
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                    <div className="pt-14 pb-6 px-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-xl font-bold text-ink">
                            Kira Nakamura
                          </h4>
                          <p className="text-sm text-ink/60">@kiranakamura</p>
                        </div>
                        <span className="px-3 py-1 bg-fuchsia-50 text-fuchsia-700 text-xs font-bold rounded-full">
                          Pro
                        </span>
                      </div>
                      <p className="text-sm text-ink/80 mb-6">
                        Digital Illustrator & Concept Artist. Creating weekly
                        fantasy landscapes.
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-ink/10 hover:bg-paper transition-colors cursor-pointer">
                          <Instagram className="w-5 h-5 text-fuchsia-500" />
                          <span className="text-sm font-medium">
                            @kiranakamura_art
                          </span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-ink/10 hover:bg-paper transition-colors cursor-pointer">
                          <Globe className="w-5 h-5 text-ocean-500" />
                          <span className="text-sm font-medium">
                            civitai.com/user/kiranakamura
                          </span>
                        </div>
                      </div>

                      <button className="w-full mt-6 py-3 bg-ink text-white rounded-xl font-medium text-sm hover:bg-ink/90 transition-colors">
                        Save Profile
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-ink/5 p-6"
                  >
                    <div className="border-2 border-dashed border-ocean-200 bg-ocean-50/50 rounded-xl p-8 text-center mb-6 transition-colors hover:border-ocean-400 hover:bg-ocean-50 cursor-pointer">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-ocean-500">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-ink mb-2">
                        Drag & Drop Artwork
                      </h4>
                      <p className="text-sm text-ink/60">
                        Supports PNG, JPG, up to 50MB
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h5 className="text-sm font-bold text-ink/80">
                        Recent Uploads
                      </h5>
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 p-3 rounded-xl border border-ink/5 bg-paper"
                        >
                          <div className="w-12 h-12 bg-ocean-100 rounded-lg flex items-center justify-center text-ocean-600">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="h-4 bg-ink/10 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-ink/5 rounded w-1/2"></div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-jade-500" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-ink/5 p-8 text-center"
                  >
                    <div className="w-20 h-20 bg-jade-100 rounded-full flex items-center justify-center mx-auto mb-6 text-jade-600">
                      <Share2 className="w-10 h-10" />
                    </div>
                    <h4 className="text-2xl font-bold text-ink mb-2">
                      You're Ready!
                    </h4>
                    <p className="text-ink/60 mb-8 text-sm">
                      Share your unique link on social media to start accepting
                      subscribers.
                    </p>

                    <div className="flex items-center p-2 bg-paper rounded-xl border border-ink/10 mb-6">
                      <div className="flex-1 text-sm font-medium text-ink/80 truncate px-2">
                        artsub.com/elenahart
                      </div>
                      <button
                        onClick={handleCopy}
                        className={cn(
                          "px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2",
                          copied ? "bg-jade-500" : "bg-ink hover:bg-ink/90",
                        )}
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-ink/10 hover:bg-paper transition-colors text-sm font-medium">
                        <Instagram className="w-4 h-4" /> Story
                      </button>
                      <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-ink/10 hover:bg-paper transition-colors text-sm font-medium">
                        <LinkIcon className="w-4 h-4" /> Bio Link
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeStep === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-ink/5 p-6"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-lg font-bold text-ink">Overview</h4>
                      <select className="text-sm border-none bg-paper px-3 py-1 rounded-lg text-ink/70 outline-none">
                        <option>Last 30 days</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-vermilion/10 to-transparent border border-vermilion/20">
                        <div className="flex items-center gap-2 text-vermilion mb-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            MRR
                          </span>
                        </div>
                        <div className="text-3xl font-bold text-ink mb-1">
                          $6,020
                        </div>
                        <div className="text-xs text-jade-600 flex items-center gap-1 font-medium">
                          <TrendingUp className="w-3 h-3" /> +12% this month
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gradient-to-br from-ocean-50 to-transparent border border-ocean-100">
                        <div className="flex items-center gap-2 text-ocean-600 mb-2">
                          <Users className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Subscribers
                          </span>
                        </div>
                        <div className="text-3xl font-bold text-ink mb-1">
                          1,204
                        </div>
                        <div className="text-xs text-jade-600 flex items-center gap-1 font-medium">
                          <TrendingUp className="w-3 h-3" /> +45 new
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-bold text-ink/80 mb-4">
                        Recent Subscribers
                      </h5>
                      <div className="space-y-3">
                        {[
                          { name: "Alex R.", amount: "$5", time: "2h ago" },
                          { name: "Sam K.", amount: "$15", time: "5h ago" },
                          { name: "Jordan M.", amount: "$5", time: "1d ago" },
                        ].map((sub, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-paper transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-paper-dark rounded-full flex items-center justify-center text-xs font-bold text-ink/50">
                                {sub.name[0]}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-ink">
                                  {sub.name}
                                </div>
                                <div className="text-xs text-ink/50">
                                  {sub.time}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-bold text-jade-600">
                              {sub.amount}/mo
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
