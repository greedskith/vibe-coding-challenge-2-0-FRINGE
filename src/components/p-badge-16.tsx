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
          ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
          : "border-zinc-800/80 bg-zinc-900/50 text-zinc-400",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full shrink-0",
          isReady ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-zinc-500"
        )}
      />
      <span>{isReady ? "Ready" : "Pending"}</span>
    </span>
  );
}

export default CossBadge16;
