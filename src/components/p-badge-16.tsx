import * as React from "react";
import { cn } from "@/lib/utils";

export interface ReadyBadgeProps {
  isReady: boolean;
  className?: string;
}

export function CossBadge16({ isReady, className }: ReadyBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0 select-none transition-colors",
        isReady
          ? "border-zinc-200 bg-zinc-100 text-zinc-950 font-semibold shadow-xs"
          : "border-zinc-800 bg-zinc-900 text-zinc-400",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full shrink-0",
          isReady ? "bg-zinc-950" : "border border-zinc-600 bg-transparent"
        )}
      />
      <span>{isReady ? "Ready" : "Pending"}</span>
    </span>
  );
}

export default CossBadge16;
