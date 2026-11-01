"use client";

import React, { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { User, LogOut, Trophy, Check, TrendingUp, Sparkles } from "lucide-react";
import { CossBadge16 } from "@/components/p-badge-16";
import { ReadyResult } from "@/lib/types";

export default function PlayerPage() {
  const { data: session } = useSession();
  const [playerData, setPlayerData] = useState<ReadyResult | null>(null);

  const playerId = (session?.user as any)?.playerId;

  useEffect(() => {
    if (!playerId) return;

    const fetchOwnData = async () => {
      try {
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
      }
    };

    fetchOwnData();
  }, [playerId]);

  const isReady = playerData?.isReady ?? false;
  const attendancePct = playerData?.attendancePct ?? 0;
  const matchCount = playerData?.matchCount ?? 0;
  const sessionsPresent = playerData?.sessionsPresent ?? 0;
  const sessionsHeld = playerData?.sessionsHeld ?? 0;

  const athleteName = session?.user?.name || playerData?.player?.name || "Athlete";
  const initials = athleteName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-dvh w-full flex-col bg-zinc-950 text-zinc-50 select-none">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 px-4 sm:px-8 py-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">
              <Trophy className="size-4 text-zinc-300" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                Academy Desk
              </span>
              <span className="text-[11px] font-mono text-zinc-400 block">
                Athlete Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-300">
              Athlete
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Athlete Profile Card with Generous Breathing Room */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
              <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-200 font-semibold text-xs sm:text-sm">
                {initials || <User className="size-5 text-zinc-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-zinc-100 truncate leading-snug">
                  {athleteName}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-normal truncate mt-0.5">
                  {playerData?.player?.sport || "Multi-sport"} · Age {playerData?.player?.age || 17} · Dumka Academy
                </p>
              </div>
            </div>

            <CossBadge16 isReady={isReady} className="shrink-0" />
          </div>

          {/* Stat Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                <span>Attendance Rate</span>
                <TrendingUp className="size-4 text-zinc-500" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                {attendancePct}%
              </div>
              <p className="mt-1 text-xs text-zinc-500 font-mono">
                {sessionsPresent} of {sessionsHeld} sessions
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                <span>Official Matches</span>
                <Trophy className="size-4 text-zinc-500" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                {matchCount}
              </div>
              <p className="mt-1 text-xs text-zinc-500 font-mono">
                {matchCount >= 2 ? "Target met (≥2 matches)" : `Needs ${2 - matchCount} more match`}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                <span>Trial Eligibility</span>
                <Sparkles className="size-4 text-zinc-500" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
                {isReady ? "Qualified" : "In Progress"}
              </div>
              <p className="mt-1 text-xs text-zinc-500 font-mono">
                {isReady ? "Visible on Scout Board" : "Requires ≥75% & ≥2 matches"}
              </p>
            </div>
          </div>

          {/* Readiness Benchmark Progress */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Trial Readiness Benchmark
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Athletes must maintain ≥75% attendance and play at least 2 matches to qualify for scout trials.
                </p>
              </div>
              <span
                className={`text-xs font-mono font-medium ${
                  attendancePct >= 75 ? "text-zinc-200" : "text-zinc-400"
                }`}
              >
                {attendancePct >= 75 ? "Target Met" : "Target 75%"}
              </span>
            </div>

            {/* 75% Tick Threshold Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="relative h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                {/* Progress bar fill */}
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    attendancePct >= 75 ? "bg-zinc-100" : "bg-zinc-500"
                  }`}
                  style={{ width: `${Math.min(100, attendancePct)}%` }}
                />
                {/* 75% vertical tick mark with clear contrast */}
                <div
                  className={`absolute top-0 bottom-0 w-0.5 z-10 ${
                    attendancePct >= 75 ? "bg-zinc-950" : "bg-zinc-300"
                  }`}
                  style={{ left: "75%" }}
                  title="75% Target"
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>0%</span>
                <span className="text-zinc-300 font-semibold">75% Target |</span>
                <span>100%</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="pt-3 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
                <span className="text-zinc-400">Attendance Benchmark (≥75%)</span>
                <span className="font-mono font-semibold text-zinc-200 flex items-center gap-1.5">
                  {attendancePct}% {attendancePct >= 75 && <Check className="size-3.5 text-zinc-100" />}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
                <span className="text-zinc-400">Match Experience (≥2 matches)</span>
                <span className="font-mono font-semibold text-zinc-200 flex items-center gap-1.5">
                  {matchCount}/2 {matchCount >= 2 && <Check className="size-3.5 text-zinc-100" />}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
