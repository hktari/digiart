import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface NavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  nextLabel?: string;
  showPrevious?: boolean;
  showNext?: boolean;
  className?: string;
  backgroundVariant?: "light" | "dark";
}

export function NavigationButtons({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  nextLabel,
  showPrevious = true,
  showNext = true,
  className = "",
  backgroundVariant = "light",
}: NavigationButtonsProps) {
  const isLastStep = currentStep === totalSteps;
  const backgroundColor =
    backgroundVariant === "dark" ? "bg-paper-dark/95" : "bg-paper/95";

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 ${backgroundColor} backdrop-blur-sm border-t border-ink/5 p-3 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between gap-4">
          {showPrevious ? (
            <Button
              onClick={onPrevious}
              variant="ghost"
              size="lg"
              className="flex gap-1 items-center"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Previous
            </Button>
          ) : (
            <div></div>
          )}

          {showNext ? (
            <Button
              onClick={onNext}
              variant="positive"
              size="lg"
              className="flex gap-1 items-center"
            >
              {nextLabel ||
                (isLastStep ? "Complete" : `${getNextStepLabel(currentStep)}`)}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
}

function getNextStepLabel(step: number): string {
  switch (step) {
    case 1:
      return "Explore Similar Artists";
    case 2:
      return "Customize Booklet";
    case 3:
      return "Subscribe";
    default:
      return "Next";
  }
}
