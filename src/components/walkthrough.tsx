"use client";

import React, { useState, useEffect, useCallback } from "react";
import { HelpCircle, ChevronRight, ChevronLeft, X, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WalkthroughStep {
  target: string;
  title: string;
  description: string;
  actionHint?: string;
}

export const COACH_STEPS: WalkthroughStep[] = [
  {
    target: '[data-tour="coach-discipline"]',
    title: "Discipline Selector",
    description:
      "Switch between Football and Cricket. Sessions, match scores, and readiness criteria remain strictly isolated per sport.",
    actionHint: "Click to toggle between sports anytime.",
  },
  {
    target: '[data-tour="coach-nav"]',
    title: "Academy Workspaces",
    description:
      "Navigate across Attendance check-ins, Match recording, Roster profiles, and the qualification Ready Board.",
    actionHint: "All tabs update live without page refreshes.",
  },
  {
    target: '[data-tour="coach-session"]',
    title: "Session Manager",
    description:
      "Select today's practice session or switch to past dates. Locked sessions become read-only to preserve attendance records.",
    actionHint: "Use '+ Open New Session' to start a workout.",
  },
  {
    target: '[data-tour="coach-ready"]',
    title: "Trial Readiness Rule",
    description:
      "Athletes qualify for the Trial Roster once they hit at least 75% attendance and complete at least 2 matches in their discipline.",
    actionHint: "Status updates in real-time as you mark records.",
  },
];

export const SCOUT_STEPS: WalkthroughStep[] = [
  {
    target: '[data-tour="scout-header"]',
    title: "Verified Talent Roster",
    description:
      "Live count of qualified candidates. Only athletes who cleared both attendance and match benchmarks appear in this portal.",
    actionHint: "Zero unverified or absent players are shown.",
  },
  {
    target: '[data-tour="scout-candidate"]',
    title: "Candidate Profiles",
    description:
      "Review qualified athletes with their age division, verified match record, and trial readiness confirmation.",
    actionHint: "Profiles reflect real-time academy training data.",
  },
  {
    target: '[data-tour="scout-metrics"]',
    title: "Readiness Verification",
    description:
      "Inspect the 75% benchmark tick mark and match completion pips to verify exact athlete qualifications before trial callbacks.",
    actionHint: "Click through cards for complete evaluation.",
  },
];

export const PLAYER_STEPS: WalkthroughStep[] = [
  {
    target: '[data-tour="player-badge"]',
    title: "Trial Readiness Status",
    description:
      "Shows your live qualification standing. When marked 'Ready', your profile is unlocked for talent scouts and academy trials.",
    actionHint: "Target: 75% Attendance + 2 Matches minimum.",
  },
  {
    target: '[data-tour="player-benchmarks"]',
    title: "Qualification Gauges",
    description:
      "Track your session attendance percentage toward the 75% threshold and your 2 required match appearances.",
    actionHint: "Regular attendance maintains your readiness.",
  },
  {
    target: '[data-tour="player-history"]',
    title: "Training & Match Log",
    description:
      "Review your personal session check-in record and official academy match scores.",
    actionHint: "Only your individual data is displayed here.",
  },
];

interface WalkthroughProps {
  role: "coach" | "scout" | "player";
  steps: WalkthroughStep[];
  isOpen: boolean;
  onClose: () => void;
}

export function Walkthrough({ role, steps, isOpen, onClose }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const measureTarget = useCallback(() => {
    if (!isOpen || steps.length === 0) {
      setTargetRect(null);
      return;
    }

    const step = steps[currentStep];
    if (!step) return;

    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, steps, currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    measureTarget();

    const handleResize = () => measureTarget();
    const handleScroll = () => measureTarget();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, currentStep, measureTarget]);

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem(`academy_walkthrough_${role}`, "true");
    } catch {
      // Storage unavailable
    }
    onClose();
    setCurrentStep(0);
  }, [role, onClose]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleComplete();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleComplete, handleNext, handlePrev]);

  if (!isOpen || steps.length === 0) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // Determine card positioning
  let cardStyle: React.CSSProperties = {};
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  if (isMobile || !targetRect) {
    // Mobile or element not in DOM: pinned to bottom/center
    cardStyle = {};
  } else {
    // Desktop positioning
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const preferBelow = spaceBelow > 220;

    const top = preferBelow
      ? targetRect.bottom + 14
      : Math.max(16, targetRect.top - 210);

    const left = Math.max(
      16,
      Math.min(targetRect.left, window.innerWidth - 370)
    );

    cardStyle = {
      top: `${top}px`,
      left: `${left}px`,
    };
  }

  return (
    <div className="fixed inset-0 z-[9990] select-none">
      {/* Target Element Spotlight Cutout */}
      {targetRect && (
        <div
          className="fixed rounded-md pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow:
              "0 0 0 9999px rgba(9, 9, 11, 0.78), 0 0 0 2px #f4f4f5, 0 0 20px rgba(255, 255, 255, 0.25)",
            zIndex: 9998,
          }}
        />
      )}

      {/* Backdrop fallback when no specific element is targeted */}
      {!targetRect && (
        <div
          onClick={handleComplete}
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xs transition-opacity z-[9995]"
        />
      )}

      {/* Step Commentary Card */}
      <div
        className={cn(
          "z-[9999] bg-zinc-950 border-2 border-zinc-700 text-zinc-100 p-4 sm:p-5 rounded-lg shadow-[4px_4px_0px_0px_#ffffff] max-w-sm w-[calc(100%-2rem)] sm:w-[350px] transition-all duration-200",
          !targetRect || isMobile
            ? "fixed bottom-5 inset-x-0 mx-auto"
            : "fixed"
        )}
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
      >
        {/* Header: Tag + Step counter + Close */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-xs border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-300">
              <Sparkles className="size-3 text-zinc-300" />
              <span>{role} Tour</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-sm hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Skip Walkthrough"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-1.5 mb-4">
          <h4 className="text-sm font-bold tracking-tight font-mono text-zinc-100">
            {step.title}
          </h4>
          <p className="text-xs leading-relaxed text-zinc-300">
            {step.description}
          </p>
          {step.actionHint && (
            <p className="text-[11px] font-mono text-zinc-400 pt-1">
              {step.actionHint}
            </p>
          )}
        </div>

        {/* Progress dots & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "size-1.5 rounded-full transition-all",
                  idx === currentStep
                    ? "w-4 bg-zinc-100"
                    : "bg-zinc-700"
                )}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 rounded-sm border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-mono text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-3" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 rounded-sm border-2 border-zinc-100 bg-zinc-100 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-zinc-950 hover:bg-white active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_0px_#ffffff] transition-all cursor-pointer"
            >
              <span>{isLast ? "Done" : "Next"}</span>
              {isLast ? (
                <Check className="size-3 stroke-[3]" />
              ) : (
                <ChevronRight className="size-3 stroke-[3]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WalkthroughTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-sm border border-zinc-700 bg-zinc-900/80 hover:border-zinc-500 hover:bg-zinc-800 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-zinc-100 transition-all cursor-pointer shadow-[1px_1px_0px_0px_#ffffff]",
        className
      )}
      title="Quick Walkthrough"
    >
      <HelpCircle className="size-3.5 text-zinc-400" />
      <span className="hidden sm:inline">Tour</span>
    </button>
  );
}
