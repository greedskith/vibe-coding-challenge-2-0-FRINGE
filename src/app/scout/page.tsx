"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Sparkles, LogOut, Trophy, Check, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CossBadge16 } from "@/components/p-badge-16";
import { ReadyResult } from "@/lib/types";

export default function ScoutPage() {
  const [candidates, setCandidates] = useState<ReadyResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReadyPlayers = async () => {
    try {
      setLoading(true);
      // CHECK 4: Filter strictly readyOnly
      const res = await fetch("/api/ready?filter=readyOnly");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCandidates(data);
      }
    } catch (err) {
      console.error("Failed to fetch scout candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadyPlayers();
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-zinc-950 text-zinc-50 select-none">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          <span className="text-sm font-bold tracking-tight text-zinc-100">
            Scout Desk
          </span>
          <Badge
            variant="outline"
            className="border-zinc-800 bg-zinc-900/60 text-[10px] text-purple-400 font-mono py-0 px-2"
          >
            Scout
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="size-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {/* Readiness Count Pill */}
        <div className="flex items-center justify-between rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500 text-zinc-950">
              <Sparkles className="size-4" />
            </div>
            <div className="text-sm font-bold text-zinc-100">
              Trial Feed
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-purple-500/40 bg-purple-500/15 text-purple-300 text-xs font-bold font-mono py-1 px-2.5"
          >
            {candidates.length} Qualified
          </Badge>
        </div>

        {/* Scout Qualified Athletes List */}
        {candidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500 space-y-2">
            <ShieldAlert className="size-8 mx-auto text-zinc-600" />
            <span className="text-xs font-mono text-zinc-500">0 qualified</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {candidates.map((item) => {
              const pId = item.player._id?.toString() || "";

              return (
                <div
                  key={pId}
                  className="rounded-2xl border border-emerald-500/40 bg-zinc-900/80 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">
                        {item.player.name}
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        {item.player.sport} · {item.player.age}
                      </p>
                    </div>

                    {/* Coss p-badge-16 */}
                    <CossBadge16 isReady={true} />
                  </div>

                  {/* 75% Tick Threshold Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-400">
                        <strong className="text-zinc-100">
                          {item.attendancePct}%
                        </strong>{" "}
                        ({item.sessionsPresent}/{item.sessionsHeld})
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        75% |
                      </span>
                    </div>

                    <div className="relative h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-zinc-100 z-10"
                        style={{ left: "75%" }}
                        title="75%"
                      />
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, item.attendancePct)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Trophy className="size-3 text-emerald-400" />
                      {item.matchCount} Matches
                    </span>

                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="size-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
