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
        "inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-0.5 text-xs font-medium text-zinc-200 shrink-0 select-none",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full shrink-0",
          isReady ? "bg-emerald-400" : "bg-zinc-500"
        )}
      />
      <span>{isReady ? "Ready" : "Pending"}</span>
    </span>
  );
}

export default CossBadge16;
