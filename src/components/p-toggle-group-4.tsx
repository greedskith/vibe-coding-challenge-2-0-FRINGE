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
        "inline-flex items-center rounded-sm bg-zinc-950 border-2 border-zinc-700 p-0.5 shadow-[2px_2px_0px_0px_#ffffff]",
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
              "flex-1 text-center rounded-xs px-3 py-1 text-xs font-mono transition-all cursor-pointer select-none uppercase tracking-wider",
              isSelected
                ? "bg-zinc-100 text-zinc-950 font-black shadow-[1px_1px_0px_0px_#ffffff]"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
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
