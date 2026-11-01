"use client";

import React, { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { User, LogOut, Trophy, Check, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CossBadge16 } from "@/components/p-badge-16";
import { ReadyResult } from "@/lib/types";

export default function PlayerPage() {
  const { data: session } = useSession();
  const [playerData, setPlayerData] = useState<ReadyResult | null>(null);
  const [loading, setLoading] = useState(true);

  const playerId = (session?.user as any)?.playerId;

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    const fetchOwnData = async () => {
      try {
        setLoading(true);
        // CHECK 4: Strictly only this player's data
        const res = await fetch(`/api/ready?playerId=${playerId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPlayerData(data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load player record:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnData();
  }, [playerId]);

  const isReady = playerData?.isReady ?? false;
  const attendancePct = playerData?.attendancePct ?? 0;
  const matchCount = playerData?.matchCount ?? 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-zinc-950 text-zinc-50 select-none">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <span className="text-sm font-bold tracking-tight text-zinc-100">
            Athlete Desk
          </span>
          <Badge
            variant="outline"
            className="border-zinc-800 bg-zinc-900/60 text-[10px] text-blue-400 font-mono py-0 px-2"
          >
            Athlete
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
      <main className="flex-1 px-4 py-5 space-y-4">
        {/* Profile Header */}
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 font-bold">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                {session?.user?.name || "Athlete"}
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                {playerData?.player?.sport || "Athlete"} · Age {playerData?.player?.age || 17}
              </p>
            </div>
          </div>

          {/* Coss p-badge-16 */}
          <CossBadge16 isReady={isReady} />
        </div>

        {/* 2 Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-zinc-100">
                {attendancePct}%
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {playerData?.sessionsPresent || 0}/{playerData?.sessionsHeld || 0} Sessions
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
              <Trophy className="size-4" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-zinc-100">
                {matchCount}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">Matches</div>
            </div>
          </div>
        </div>

        {/* Visual 75% Tick Threshold Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-300 font-semibold">
              Readiness Track
            </span>
            <span
              className={
                attendancePct >= 75 ? "text-emerald-400 font-semibold" : "text-amber-400"
              }
            >
              {attendancePct >= 75 ? "Target Met" : "Target 75%"}
            </span>
          </div>

          {/* Progress track with 75% vertical tick mark */}
          <div className="space-y-1">
            <div className="relative h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-zinc-100 z-10"
                style={{ left: "75%" }}
                title="75%"
              />
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  attendancePct >= 75 ? "bg-emerald-500" : "bg-amber-500/70"
                }`}
                style={{ width: `${Math.min(100, attendancePct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>0%</span>
              <span className="text-zinc-300 font-bold">75% |</span>
              <span>100%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Status</span>
            {isReady ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Check className="size-3.5" />
                Ready
              </span>
            ) : (
              <span className="text-zinc-500">
                Pending
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
