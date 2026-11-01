import * as React from "react";
import { Badge } from "@/components/ui/badge";

export interface ReadyBadgeProps {
  isReady: boolean;
  className?: string;
}

export function CossBadge16({ isReady, className }: ReadyBadgeProps) {
  return isReady ? (
    <Badge
      variant="outline"
      className={`border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1.5 py-1 px-2.5 font-medium text-xs font-mono ${className || ""}`}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
      />
      Ready
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className={`border-zinc-800 bg-zinc-900/60 text-zinc-400 gap-1.5 py-1 px-2.5 font-medium text-xs font-mono ${className || ""}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-zinc-500" />
      Pending
    </Badge>
  );
}

export default CossBadge16;
