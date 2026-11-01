"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
    <ToggleGroup
      value={[value]}
      onValueChange={(val) => {
        if (val.length > 0) onValueChange(val[0]);
      }}
      variant="outline"
      size="sm"
      className={`rounded-full bg-zinc-900/80 p-0.5 border border-zinc-800 ${className || ""}`}
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          aria-label={opt.label}
          className="rounded-full text-[11px] px-2.5 py-0.5 data-pressed:bg-emerald-500 data-pressed:text-zinc-950 font-medium transition-colors"
        >
          {opt.shortLabel || opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export default CossToggleGroup4;
