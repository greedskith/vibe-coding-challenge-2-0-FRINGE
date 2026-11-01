"use client";

import * as React from "react";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";

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
  return (
    <NumberField
      value={value}
      onValueChange={(val) => onValueChange(val ?? 0)}
      disabled={disabled}
      min={min}
      max={max}
      size="sm"
      className={className}
    >
      <NumberFieldGroup className="rounded-full bg-zinc-950 border border-zinc-800 focus-within:border-emerald-500/80">
        <NumberFieldDecrement />
        <NumberFieldInput
          aria-label={ariaLabel}
          className="text-xs tabular-nums text-zinc-100 font-mono w-10 text-center"
        />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  );
}

export default CossNumberField11;
