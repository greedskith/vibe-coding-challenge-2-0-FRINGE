"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CossNumberField11Props {
  value: number;
  onValueChange: (val: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
  ariaLabel?: string;
}

export function CossNumberField11({
  value,
  onValueChange,
  disabled = false,
  min = 0,
  max = 99,
  className,
  ariaLabel = "Score",
}: CossNumberField11Props) {
  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    onValueChange(Math.max(min, (value || 0) - 1));
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    onValueChange(Math.min(max, (value || 0) + 1));
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 transition-colors focus-within:border-zinc-600",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={handleDecrement}
        aria-label="Decrease score"
        className="relative flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer touch-manipulation after:absolute after:-inset-2 after:content-['']"
      >
        <Minus className="size-3.5" />
      </button>

      <input
        type="number"
        value={value}
        disabled={disabled}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onValueChange(isNaN(val) ? min : Math.min(max, Math.max(min, val)));
        }}
        className="w-10 text-center font-mono text-xs font-semibold tabular-nums text-zinc-100 bg-transparent outline-none disabled:cursor-not-allowed disabled:text-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={handleIncrement}
        aria-label="Increase score"
        className="relative flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer touch-manipulation after:absolute after:-inset-2 after:content-['']"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export default CossNumberField11;
