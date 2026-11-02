"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Trophy, Check, ShieldAlert } from "lucide-react";
import { CossBadge16 } from "@/components/p-badge-16";
import { ReadyResult } from "@/lib/types";

export default function ScoutPage() {
  const [candidates, setCandidates] = useState<ReadyResult[]>([]);

  useEffect(() => {
    let ignore = false;

    const fetchReadyPlayers = async () => {
      try {
        // CHECK 4: Filter strictly readyOnly
        const res = await fetch("/api/ready?filter=readyOnly");
        if (res.ok) {
          const data = await res.json();
          if (!ignore && Array.isArray(data)) {
            setCandidates(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch scout candidates:", err);
      }
    };

    fetchReadyPlayers();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-zinc-950 text-zinc-50">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 px-4 sm:px-8 py-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">
              <Trophy className="size-4 text-zinc-300" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                Academy Desk
              </span>
              <span className="text-[11px] font-mono text-zinc-400 block">
                Scout Portal · Dumka Trials
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-300">
              Scout
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
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header & Overview */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              Trial Roster
            </h1>

            <span className="rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-mono font-medium text-zinc-300">
              {candidates.length} Qualified
            </span>
          </div>

          {/* Candidates Grid */}
          {candidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 space-y-2">
              <ShieldAlert className="size-8 mx-auto text-zinc-600" />
              <p className="text-sm font-medium text-zinc-400">No candidates qualified for trials yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((item) => {
                const pId = item.player._id?.toString() || "";
                const initials = item.player.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={pId}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 space-y-4 shadow-xs"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2.5 sm:gap-4">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-200 font-semibold text-xs font-mono">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-semibold text-zinc-100 truncate">
                            {item.player.name}
                          </h3>
                          <p className="text-xs text-zinc-400 font-normal mt-0.5 truncate">
                            {item.player.sport} · Age {item.player.age}
                          </p>
                        </div>
                      </div>

                      <CossBadge16 isReady={true} className="shrink-0 self-center sm:self-auto text-[11px] sm:text-xs" />
                    </div>

                    {/* 75% Tick Threshold Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-400">
                          Attendance: <strong className="text-zinc-100">{item.attendancePct}%</strong>
                        </span>
                        <span className="text-zinc-300 font-semibold">
                          75% Target
                        </span>
                      </div>

                      <div className="relative h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-zinc-100 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, item.attendancePct)}%`,
                          }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-zinc-950 z-10"
                          style={{ left: "75%" }}
                          title="75% Target"
                        />
                      </div>
                    </div>

                    {/* Criteria Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs font-mono">
                      <span className="inline-flex items-center gap-1.5 text-zinc-300">
                        <Trophy className="size-3.5 text-zinc-400" />
                        {item.matchCount} {item.matchCount === 1 ? "Match" : "Matches"}
                      </span>

                      <span className="text-zinc-300 font-medium flex items-center gap-1">
                        <Check className="size-3.5 text-zinc-100" />
                        Qualified
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
