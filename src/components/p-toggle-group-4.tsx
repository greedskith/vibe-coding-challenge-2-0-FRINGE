"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CossToggleGroup4Props {
  value: string;
  onValueChange: (val: string) => void;
  options?: { value: string; label: string; shortLabel?: string }[];
  className?: string;
}

export function CossToggleGroup4({
  value,
  onValueChange,
  options = [
    { value: "Football", label: "Football", shortLabel: "FB" },
    { value: "Cricket", label: "Cricket", shortLabel: "CR" },
  ],
  className,
}: CossToggleGroup4Props) {
  return (
    <div
      role="group"
      aria-label="Select sport"
      className={cn(
        "inline-flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "flex-1 text-center rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer select-none",
              isSelected
                ? "bg-zinc-800 text-zinc-100 shadow-xs font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            )}
          >
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.shortLabel || opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default CossToggleGroup4;
