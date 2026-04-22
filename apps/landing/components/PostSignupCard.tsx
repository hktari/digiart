"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Sparkles } from "lucide-react";

interface PostSignupCardProps {
  audience: "creator" | "collector";
  onDismiss: () => void;
}

export function PostSignupCard({ audience, onDismiss }: PostSignupCardProps) {
  const router = useRouter();

  const handleShare = () => {
    router.push(`/questionnaire/${audience}s`);
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <Card className="max-w-lg w-full">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal/10 mb-4">
            <Sparkles className="w-8 h-8 text-teal" />
          </div>

          <h3 className="font-serif font-bold text-2xl md:text-3xl mb-3">
            Your Opinion Matters
          </h3>

          <p className="text-ink/70 mb-6 leading-relaxed">
            Help us design the perfect booklet experience for you. Share your
            preferences in a quick 5-minute questionnaire.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleShare} size="lg">
              Share Your Preferences
            </Button>
            <Button onClick={onDismiss} variant="ghost" size="lg">
              Maybe Later
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
