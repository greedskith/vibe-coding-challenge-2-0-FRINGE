"use client";

import React, { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { User, LogOut, Trophy, Check, Calendar, Activity } from "lucide-react";
import { CossBadge16 } from "@/components/p-badge-16";
import { ReadyResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  sessionId: string;
  date: string;
  sport: string;
  status: "PRESENT" | "ABSENT";
}

interface MatchRecord {
  matchId: string;
  date: string;
  sport: string;
  opponent?: string;
  outcome?: "win" | "draw" | "loss";
  score?: number;
  scores?: Array<{ playerId?: string; score?: number }>;
  player1Score: number;
  player2Score: number;
}

interface EnrichedReadyData extends ReadyResult {
  attendanceHistory?: AttendanceRecord[];
  matchHistory?: MatchRecord[];
}

export default function PlayerPage() {
  const { data: session } = useSession();
  const [playerData, setPlayerData] = useState<EnrichedReadyData | null>(null);

  const user = session?.user as { playerId?: string; name?: string | null } | undefined;
  const playerId = user?.playerId;

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
  const attendanceHistory = playerData?.attendanceHistory ?? [];
  const matchHistory = playerData?.matchHistory ?? [];

  const athleteName = session?.user?.name || playerData?.player?.name || "Athlete";
  const initials = athleteName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-dvh w-full flex-col bg-zinc-950 text-zinc-50">
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
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Unified High-Taste Athlete Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-7 space-y-6 shadow-xs">
            {/* Header: Avatar, Name, Sport/Age, and Ready Badge */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-200 font-semibold text-xs sm:text-sm font-mono">
                  {initials || <User className="size-5 text-zinc-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-100 truncate">
                    {athleteName}
                  </h2>
                  <p className="text-xs text-zinc-400 font-normal truncate mt-0.5">
                    {playerData?.player?.sport || "Multi-sport"} · Age {playerData?.player?.age || 17} · Dumka Academy
                  </p>
                </div>
              </div>

              <CossBadge16 isReady={isReady} className="shrink-0" />
            </div>

            {/* Metrics Row: Two Crisp Tiles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3.5">
                <span className="text-xs font-mono text-zinc-400 block">
                  Attendance
                </span>
                <div className="mt-1 text-2xl font-bold tracking-tight text-zinc-100">
                  {attendancePct}%
                </div>
                <span className="text-[11px] font-mono text-zinc-500 block mt-0.5">
                  {sessionsPresent} of {sessionsHeld} sessions
                </span>
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3.5">
                <span className="text-xs font-mono text-zinc-400 block">
                  Matches Played
                </span>
                <div className="mt-1 text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-1.5">
                  <span>{matchCount}</span>
                  {matchCount >= 2 && <Check className="size-4 text-zinc-100 stroke-[2.5]" />}
                </div>
                <span className="text-[11px] font-mono text-zinc-500 block mt-0.5">
                  Target: 2 matches min
                </span>
              </div>
            </div>

            {/* Visual Gauge with Correctly Aligned 75% Target */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Readiness Benchmark</span>
                <span className={attendancePct >= 75 ? "text-zinc-200 font-semibold" : "text-zinc-400"} title="Target 75%">
                  Target: 75% Ready Threshold
                </span>
              </div>

              <div className="relative h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    attendancePct >= 75 ? "bg-zinc-100" : "bg-zinc-500"
                  }`}
                  style={{ width: `${Math.min(100, attendancePct)}%` }}
                />
                <div
                  className={`absolute top-0 bottom-0 w-0.5 z-10 ${
                    attendancePct >= 75 ? "bg-zinc-950" : "bg-zinc-300"
                  }`}
                  style={{ left: "75%" }}
                  title="75% Target"
                />
              </div>

              {/* Anchored Visible Label Under Gauge */}
              <div className="relative w-full text-[10px] font-mono text-zinc-500 pt-0.5">
                <div
                  className="absolute -translate-x-1/2 flex items-center text-zinc-400 font-medium whitespace-nowrap"
                  style={{ left: "75%" }}
                >
                  ▲ 75% Target
                </div>
              </div>
            </div>
          </div>

          {/* Personal Attendance History */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-zinc-400" />
                <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                  Attendance History
                </h3>
              </div>
              <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs font-mono text-zinc-400">
                {attendanceHistory.length} Recorded
              </span>
            </div>

            {attendanceHistory.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-800/80 p-8 text-center">
                <p className="text-xs font-mono text-zinc-500">
                  No attendance records recorded yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attendanceHistory.map((rec, idx) => {
                  const isPres = rec.status === "PRESENT";
                  return (
                    <div
                      key={rec.sessionId || `${rec.date}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-800/70 bg-zinc-950/60 px-3.5 py-2.5 transition-colors hover:border-zinc-700"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "size-2.5 rounded-full shrink-0 transition-colors",
                            isPres
                              ? "bg-zinc-100"
                              : "border border-zinc-600 bg-transparent"
                          )}
                          aria-hidden="true"
                          title={isPres ? "Present" : "Absent"}
                        />
                        <div>
                          <span className="text-xs font-mono font-medium text-zinc-200">
                            {rec.date}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 block">
                            {rec.sport}
                          </span>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "rounded border px-2 py-0.5 text-[11px] font-mono font-medium",
                          isPres
                            ? "border-zinc-700 bg-zinc-800/90 text-zinc-200"
                            : "border-zinc-800/80 bg-zinc-900/40 text-zinc-500"
                        )}
                      >
                        {rec.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Match Contributions */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-zinc-400" />
                <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                  Match Contributions
                </h3>
              </div>
              <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs font-mono text-zinc-400">
                {matchHistory.length} Matches
              </span>
            </div>

            {matchHistory.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-800/80 p-8 text-center">
                <p className="text-xs font-mono text-zinc-500">
                  No match appearances recorded yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {matchHistory.map((m, idx) => (
                  <div
                    key={m.matchId || `${m.date}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-800/70 bg-zinc-950/60 p-3 sm:p-3.5 transition-colors hover:border-zinc-700"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          vs {m.opponent || "Academy Fixture"}
                        </span>
                        {m.outcome && (
                          <span className="shrink-0 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                            {m.outcome}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-zinc-400">
                        {m.sport} · {m.date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2.5 sm:ml-3">
                      <div className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-right">
                        <span className="text-[10px] font-mono text-zinc-500 block leading-none">
                          Score
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-100">
                          {m.score !== undefined
                            ? m.score
                            : `${m.player1Score} - ${m.player2Score}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
