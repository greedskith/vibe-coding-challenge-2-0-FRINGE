"use client";

import React, { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Trophy, Check, Calendar, Activity } from "lucide-react";
import { CossBadge16 } from "@/components/p-badge-16";
import { AthleteAvatar } from "@/components/athlete-avatar";
import { P5ArtBackground } from "@/components/p5-art-background";
import { Walkthrough, WalkthroughTrigger, PLAYER_STEPS } from "@/components/walkthrough";
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
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("academy_walkthrough_player");
      if (!seen) {
        const timer = setTimeout(() => setTourOpen(true), 750);
        return () => clearTimeout(timer);
      }
    } catch {
      // Storage unavailable
    }
  }, []);

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

  return (
    <div className="relative flex min-h-dvh w-full flex-col text-zinc-50 overflow-x-hidden">
      {/* Generative ambient p5 art background */}
      <P5ArtBackground mode="ambient" shapeCount={360} opacityMultiplier={0.7} />

      {/* Optical lens vignette for ambient depth */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none select-none z-[1] bg-radial from-transparent via-zinc-950/25 to-zinc-950/70"
      />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/92 px-4 sm:px-8 py-3.5 shadow-sm backdrop-blur-md">
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
            <WalkthroughTrigger onClick={() => setTourOpen(true)} />
            <span className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs font-mono text-zinc-300">
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
      <main className="relative z-10 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Unified High-Taste Athlete Card */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6 sm:p-7 space-y-6 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            {/* Header: Avatar, Name, Sport/Age, and Ready Badge */}
            <div data-tour="player-badge" className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <AthleteAvatar
                  name={athleteName}
                  imageUrl={playerData?.player?.imageUrl}
                  className="size-12 rounded-xl border border-zinc-800 bg-zinc-900 shrink-0"
                  textClassName="text-sm"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold tracking-tight text-zinc-100 truncate">
                    {athleteName}
                  </h2>
                  <p className="text-xs text-zinc-400 font-normal truncate mt-0.5">
                    {playerData?.player?.sport || "Multi-sport"} · Age {playerData?.player?.age || 17} · One Academy
                  </p>
                </div>
              </div>

              <CossBadge16 isReady={isReady} className="shrink-0" />
            </div>

            {/* Metrics & Benchmarks Group */}
            <div data-tour="player-benchmarks" className="space-y-4">
              {/* Metrics Row: Two Crisp Tiles */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                    Attendance
                  </span>
                  <div className="mt-1 text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-100">
                    {attendancePct}%
                  </div>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    {sessionsPresent} of {sessionsHeld} sessions
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                    Matches Played
                  </span>
                  <div className="mt-1 text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-1.5">
                    <span>{matchCount}</span>
                    {matchCount >= 2 && <Check className="size-5 text-zinc-100 stroke-[2.5]" />}
                  </div>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    Target: 2 matches min
                  </span>
                </div>
              </div>

              {/* Visual Gauge with Clean Inline Indicator */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Readiness Benchmark</span>
                  <span className={attendancePct >= 75 ? "text-zinc-200 font-medium" : "text-zinc-500 font-mono"}>
                    {attendancePct >= 75 ? "✓ 75% Target Cleared" : "75% Target Needed"}
                  </span>
                </div>

                <div className="relative h-2 w-full rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      attendancePct >= 75 ? "bg-zinc-100" : "bg-zinc-500"
                    }`}
                    style={{ width: `${Math.min(100, attendancePct)}%` }}
                  />
                  <div
                    className={`absolute top-0 bottom-0 w-0.5 z-10 ${
                      attendancePct >= 75 ? "bg-zinc-950" : "bg-zinc-400"
                    }`}
                    style={{ left: "75%" }}
                    title="75% Target"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Attendance History (Hairline List) */}
          <div data-tour="player-history" className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-5 sm:p-6 space-y-4 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-zinc-300" />
                <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                  Attendance History
                </h3>
              </div>
              <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs font-mono text-zinc-400">
                {attendanceHistory.length} Recorded
              </span>
            </div>

            {attendanceHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                <p className="text-xs text-zinc-500">
                  No attendance records recorded yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-850 rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
                {attendanceHistory.map((rec, idx) => {
                  const isPres = rec.status === "PRESENT";
                  return (
                    <div
                      key={rec.sessionId || `${rec.date}-${idx}`}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-zinc-800/30"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            isPres
                              ? "bg-zinc-100 shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                              : "border border-zinc-600 bg-transparent"
                          )}
                          aria-hidden="true"
                        />
                        <div>
                          <span className="text-xs font-mono font-medium text-zinc-200">
                            {rec.date}
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            {rec.sport} Practice
                          </span>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px] font-mono",
                          isPres
                            ? "border-zinc-700 bg-zinc-800/80 text-zinc-200 font-medium"
                            : "border-zinc-800 bg-zinc-900/60 text-zinc-500"
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

          {/* Match Contributions (Hairline List) */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-5 sm:p-6 space-y-4 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-zinc-300" />
                <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                  Match Contributions
                </h3>
              </div>
              <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs font-mono text-zinc-400">
                {matchHistory.length} Matches
              </span>
            </div>

            {matchHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                <p className="text-xs text-zinc-500">
                  No match appearances recorded yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-850 rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
                {matchHistory.map((m, idx) => (
                  <div
                    key={m.matchId || `${m.date}-${idx}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-zinc-800/30"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          vs {m.opponent || "Academy Fixture"}
                        </span>
                        {m.outcome && (
                          <span className="shrink-0 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                            {m.outcome}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-zinc-500">
                        {m.sport} · {m.date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-right">
                        <span className="text-[9px] font-mono uppercase text-zinc-500 block leading-none">
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

      {/* Guided Walkthrough Modal */}
      <Walkthrough
        role="player"
        steps={PLAYER_STEPS}
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />
    </div>
  );
}
