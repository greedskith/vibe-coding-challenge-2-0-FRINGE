"use client";

import React, { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import {
  ClipboardCheck,
  Users,
  Trophy,
  Sparkles,
  LogOut,
  CalendarDays,
  Lock,
  Unlock,
  Plus,
  AlertCircle,
  UserCheck,
  UserX,
  TrendingUp,
  Swords,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/p-dialog-1";
import { CossNumberField11 } from "@/components/p-number-field-11";
import { CossBadge16 } from "@/components/p-badge-16";
import { CossToggleGroup4 } from "@/components/p-toggle-group-4";
import { Player, Session, Match, ReadyResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "attendance" | "matches" | "ready";

const NAV_TABS = [
  { id: "attendance" as Tab, label: "Attendance", icon: ClipboardCheck },
  { id: "matches" as Tab, label: "Matches", icon: Trophy },
  { id: "ready" as Tab, label: "Ready Board", icon: Sparkles },
];

export function CoachMobileShell() {
  const [activeTab, setActiveTab] = useState<Tab>("attendance");
  const [sport, setSport] = useState<string>("Football");
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [readyResults, setReadyResults] = useState<ReadyResult[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  // Dialog States
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [newPlayerOpen, setNewPlayerOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerAge, setNewPlayerAge] = useState(16);

  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [newMatchDate, setNewMatchDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newMatchOpponent, setNewMatchOpponent] = useState("Ranchi FC");
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, boolean>>({});
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [matchError, setMatchError] = useState<string | null>(null);

  // Load all initial data
  const loadData = useCallback(async () => {
    try {
      const [playersRes, sessionsRes, matchesRes, readyRes] = await Promise.all([
        fetch("/api/players"),
        fetch("/api/sessions"),
        fetch("/api/matches"),
        fetch("/api/ready"),
      ]);

      const [pData, sData, mData, rData] = await Promise.all([
        playersRes.json(),
        sessionsRes.json(),
        matchesRes.json(),
        readyRes.json(),
      ]);

      if (Array.isArray(pData)) setPlayers(pData);
      if (Array.isArray(sData)) {
        setSessions(sData);
        // Find open or latest session matching active sport
        const sportSession =
          sData.find((s: Session) => s.sport === sport && s.status === "open") ||
          sData.find((s: Session) => s.sport === sport) ||
          sData[0] ||
          null;
        setActiveSession(sportSession);
      }
      if (Array.isArray(mData)) setMatches(mData);
      if (Array.isArray(rData)) setReadyResults(rData);
    } catch (err) {
      console.error("Failed to load coach desk data:", err);
    }
  }, [sport]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize activeSession when sport changes
  const handleSportChange = (newSport: string) => {
    setSport(newSport);
    const matchedSession =
      sessions.find((s) => s.sport === newSport && s.status === "open") ||
      sessions.find((s) => s.sport === newSport) ||
      null;
    setActiveSession(matchedSession);
  };

  // Attendance helpers
  const isPlayerPresent = (playerId: string) => {
    if (!activeSession || !Array.isArray(activeSession.attendance)) return false;
    const rec = activeSession.attendance.find(
      (a: any) => a.playerId?.toString() === playerId
    );
    return rec?.status === "present";
  };

  const handleToggleAttendance = async (playerId: string, present: boolean) => {
    if (!activeSession || activeSession.status === "closed") return;
    const newStatus = present ? "present" : "absent";

    // Optimistic UI update
    const updatedAttendance = [...(activeSession.attendance || [])];
    const idx = updatedAttendance.findIndex(
      (a: any) => a.playerId?.toString() === playerId
    );
    if (idx >= 0) {
      updatedAttendance[idx] = { ...updatedAttendance[idx], status: newStatus };
    } else {
      updatedAttendance.push({ playerId: playerId as any, status: newStatus });
    }

    const updatedSession = { ...activeSession, attendance: updatedAttendance };
    setActiveSession(updatedSession);
    setSessions((prev) =>
      prev.map((s) => (s._id === activeSession._id ? updatedSession : s))
    );

    try {
      const res = await fetch(`/api/sessions/${activeSession._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, status: newStatus }),
      });
      if (res.ok) {
        const saved = await res.json();
        setActiveSession(saved);
        fetch("/api/ready")
          .then((r) => r.json())
          .then((data) => Array.isArray(data) && setReadyResults(data));
      }
    } catch (err) {
      console.error("Failed to update attendance:", err);
    }
  };

  const handleMarkAll = async (present: boolean) => {
    if (!activeSession || activeSession.status === "closed") return;
    const newStatus = present ? "present" : "absent";
    const newAttendance = players.map((p) => ({
      playerId: p._id as any,
      status: newStatus as "present" | "absent",
    }));

    const updatedSession = { ...activeSession, attendance: newAttendance };
    setActiveSession(updatedSession);
    setSessions((prev) =>
      prev.map((s) => (s._id === activeSession._id ? updatedSession : s))
    );

    try {
      const res = await fetch(`/api/sessions/${activeSession._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance: newAttendance }),
      });
      if (res.ok) {
        const saved = await res.json();
        setActiveSession(saved);
        fetch("/api/ready")
          .then((r) => r.json())
          .then((data) => Array.isArray(data) && setReadyResults(data));
      }
    } catch (err) {
      console.error("Failed bulk attendance:", err);
    }
  };

  const handleLockSession = async () => {
    if (!activeSession || activeSession.status === "closed") return;

    try {
      const res = await fetch(`/api/sessions/${activeSession._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) {
        const locked = await res.json();
        setActiveSession(locked);
        setSessions((prev) =>
          prev.map((s) => (s._id === locked._id ? locked : s))
        );
        fetch("/api/ready")
          .then((r) => r.json())
          .then((data) => Array.isArray(data) && setReadyResults(data));
      }
    } catch (err) {
      console.error("Failed to lock session:", err);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newSessionDate, sport }),
      });
      if (res.ok) {
        const created = await res.json();
        setSessions((prev) => [
          created,
          ...prev.filter((s) => s._id !== created._id),
        ]);
        setActiveSession(created);
        setNewSessionOpen(false);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlayerName.trim(),
          age: Number(newPlayerAge),
          sport,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setPlayers((prev) => [...prev, created.player]);
        setNewPlayerName("");
        setNewPlayerOpen(false);
        fetch("/api/ready")
          .then((r) => r.json())
          .then((data) => Array.isArray(data) && setReadyResults(data));
      }
    } catch (err) {
      console.error("Failed to add player:", err);
    }
  };

  // CHECK 2 Match Creation & Absent Refusal
  const isPlayerAbsentOnMatchDate = (playerId: string, targetDate: string) => {
    const sessionForDate =
      sessions.find((s) => s.date === targetDate && s.sport === sport) ||
      sessions.find((s) => s.date === targetDate);
    if (!sessionForDate || !Array.isArray(sessionForDate.attendance)) return false;
    const record = sessionForDate.attendance.find(
      (a: any) => a.playerId?.toString() === playerId
    );
    return !record || record.status === "absent";
  };

  const handleOpenMatchModal = () => {
    setMatchError(null);
    const targetDate = activeSession?.date || new Date().toISOString().slice(0, 10);
    setNewMatchDate(targetDate);

    const initialScores: Record<string, number> = {};
    const initialSelected: Record<string, boolean> = {};

    players.forEach((p) => {
      const pId = p._id?.toString() || "";
      const isAbsent = isPlayerAbsentOnMatchDate(pId, targetDate);
      initialScores[pId] = 0;
      initialSelected[pId] = !isAbsent; // Automatically select present players, unselect absent
    });

    setMatchScores(initialScores);
    setSelectedPlayers(initialSelected);
    setNewMatchOpen(true);
  };

  const handleRecordMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatchError(null);

    // Collect scores only for selected players
    const scoresPayload: { playerId: string; score: number }[] = [];
    for (const p of players) {
      const pId = p._id?.toString() || "";
      if (selectedPlayers[pId]) {
        scoresPayload.push({
          playerId: pId,
          score: matchScores[pId] || 0,
        });
      }
    }

    if (scoresPayload.length === 0) {
      setMatchError("Select at least one player");
      return;
    }

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newMatchDate,
          sport,
          opponent: newMatchOpponent.trim() || "Opponent",
          scores: scoresPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMatchError(data.error || "Refused");
        return;
      }

      const created = await res.json();
      setMatches((prev) => [created, ...prev]);
      setNewMatchOpen(false);

      // Refresh ready results
      fetch("/api/ready")
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setReadyResults(data));
    } catch (err: any) {
      setMatchError(err.message || "Failed to record match");
    }
  };

  // Compute stat counts for active session
  const presentCount = players.filter((p) =>
    isPlayerPresent(p._id?.toString() || "")
  ).length;
  const absentCount = players.length - presentCount;
  const attendanceRate =
    players.length > 0 ? Math.round((presentCount / players.length) * 100) : 0;
  const qualifiedCount = readyResults.filter((r) => r.isReady).length;

  // Sport-scoped filtered data to avoid cross-contamination
  const filteredMatches = matches.filter((m) => !sport || m.sport === sport);
  const filteredReadyResults = readyResults.filter(
    (r) => !sport || r.player.sport === sport
  );
  const sportQualifiedCount = filteredReadyResults.filter((r) => r.isReady).length;

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-hidden bg-zinc-950 text-zinc-50 select-none">
      {/* 1. Desktop Left Sidebar (Inspired by shadcn dashboard-01) */}
      <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col justify-between border-r border-zinc-800 bg-zinc-950 p-4 sticky top-0 h-dvh overflow-y-auto">
        <div className="space-y-6">
          {/* Academy Branding */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex size-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">
              <Trophy className="size-4 text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold tracking-tight text-zinc-100 truncate">
                Academy Desk
              </div>
              <div className="text-[11px] text-zinc-400 font-mono truncate">
                Dumka Academy
              </div>
            </div>
          </div>

          {/* Role Indicator & Sport Switcher */}
          <div className="space-y-3 px-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                Role
              </span>
              <Badge
                variant="outline"
                className="border-zinc-800 bg-zinc-900/80 text-[10px] text-zinc-300 font-mono py-0 px-2"
              >
                Coach
              </Badge>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 block">
                Discipline
              </label>
              <CossToggleGroup4
                value={sport}
                onValueChange={handleSportChange}
                options={[
                  { value: "Football", label: "Football", shortLabel: "FB" },
                  { value: "Cricket", label: "Cricket", shortLabel: "CR" },
                ]}
                className="w-full justify-between"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_TABS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-zinc-800/90 text-zinc-100 shadow-xs"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  )}
                >
                  <Icon className="size-4 shrink-0 text-zinc-400" />
                  <span>{item.label}</span>
                  {item.id === "ready" && qualifiedCount > 0 && (
                    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-200 border border-zinc-700/60">
                      {qualifiedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Area */}
        <div className="border-t border-zinc-800/80 pt-4 px-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-200 font-mono">
                HC
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">
                  Coach
                </p>
                <p className="text-[10px] text-zinc-500 font-mono truncate">
                  Dumka Academy
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-dvh overflow-x-hidden">
        {/* Mobile Header (< lg) */}
        <header className="flex lg:hidden sticky top-0 z-30 flex-col border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
          {/* Top Bar: Academy branding, Coach badge, Sign Out */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">
                <Trophy className="size-4 text-zinc-300" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-zinc-100">
                  Academy Desk
                </span>
                <Badge
                  variant="outline"
                  className="border-zinc-800 bg-zinc-900/80 text-[10px] text-zinc-400 font-mono py-0 px-1.5"
                >
                  Coach
                </Badge>
              </div>
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>

          {/* Sub Bar: Discipline Toggle & Tab-Scoped Actions */}
          <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-1.5 bg-zinc-950/60 gap-2">
            <CossToggleGroup4
              value={sport}
              onValueChange={handleSportChange}
              options={[
                { value: "Football", label: "Football" },
                { value: "Cricket", label: "Cricket" },
              ]}
              className="h-7.5"
            />

            {/* Attendance Tab Controls */}
            {activeTab === "attendance" && (
              <div className="flex items-center gap-1.5 shrink-0">
                {activeSession && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px] font-mono text-zinc-300">
                    <CalendarDays className="size-3 text-zinc-400" />
                    <span>{activeSession.date}</span>
                  </div>
                )}
                {activeSession && activeSession.status !== "closed" ? (
                  <button
                    type="button"
                    onClick={handleLockSession}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
                    title="Lock Session"
                  >
                    <Lock className="size-3" />
                  </button>
                ) : activeSession ? (
                  <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-500">
                    <Lock className="size-3 inline" />
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setNewSessionOpen(true)}
                  className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
                  title="New Session"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            )}

            {/* Matches Tab Controls */}
            {activeTab === "matches" && (
              <button
                type="button"
                onClick={handleOpenMatchModal}
                className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="size-3" />
                <span>Match</span>
              </button>
            )}

            {/* Ready Board Tab Status */}
            {activeTab === "ready" && (
              <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                {sportQualifiedCount}/{filteredReadyResults.length} Ready
              </span>
            )}
          </div>
        </header>

        {/* Desktop Top Header Bar (lg:) */}
        <header className="hidden lg:flex sticky top-0 z-20 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 sm:px-8 py-3.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Dashboard
            </span>
            <span className="text-xs text-zinc-600">/</span>
            <span className="text-xs font-semibold text-zinc-200 capitalize">
              {activeTab === "ready" ? "Ready Board" : activeTab}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {activeSession && (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-mono text-zinc-300 whitespace-nowrap shrink-0">
                <CalendarDays className="size-3.5 text-zinc-400" />
                <span>{activeSession.date}</span>
                <span className="text-zinc-600">·</span>
                <span className={activeSession.status === "closed" ? "text-zinc-500" : "text-zinc-200"}>
                  {activeSession.status === "closed" ? "Locked" : "Open"}
                </span>
              </div>
            )}

            {/* Quick Action Buttons on Desktop */}
            {activeTab === "attendance" && (
              <div className="flex items-center gap-2 shrink-0">
                {activeSession && activeSession.status !== "closed" && (
                  <button
                    type="button"
                    onClick={handleLockSession}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Lock className="size-3.5 text-zinc-400" />
                    Lock Session
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNewPlayerOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="size-3.5" />
                  Add Athlete
                </button>
                <button
                  type="button"
                  onClick={() => setNewSessionOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="size-3.5" />
                  Open Session
                </button>
              </div>
            )}

            {activeTab === "matches" && (
              <button
                type="button"
                onClick={handleOpenMatchModal}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="size-3.5" />
                Record Match
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Main Scrollable Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6 pb-24 lg:pb-8 overflow-x-hidden">
          {/* TAB 1: ATTENDANCE (DESK) */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              {/* 2-Card Metric Overview: Side-by-side on mobile, recovering 100px vertical space */}
              <section className="grid grid-cols-2 gap-2.5 sm:gap-4">
                {/* Card 1: Attendance */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span>Attendance</span>
                    <span className="rounded-md border border-zinc-800 bg-zinc-950 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] text-zinc-300">
                      {attendanceRate}%
                    </span>
                  </div>
                  <div className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                    {presentCount} <span className="text-zinc-500 font-normal text-base sm:text-xl">/ {players.length}</span>
                  </div>
                </div>

                {/* Card 2: Trial Ready */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span>Trial Ready</span>
                    <span className="rounded-md border border-zinc-800 bg-zinc-950 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] text-zinc-300">
                      {players.length > 0 ? Math.round((qualifiedCount / players.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                    {qualifiedCount} <span className="text-zinc-500 font-normal text-base sm:text-xl">/ {players.length}</span>
                  </div>
                </div>
              </section>

              <div className="space-y-4">
              {/* Athletes Bar & Quick Mark Row */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">
                    Athletes
                  </span>
                  <Badge
                    variant="outline"
                    className="border-zinc-800 bg-zinc-900/80 text-[11px] font-mono text-zinc-400 py-0 px-2"
                  >
                    {players.length}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {activeSession?.status !== "closed" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMarkAll(true)}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer font-mono whitespace-nowrap"
                      >
                        Mark all
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkAll(false)}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer font-mono whitespace-nowrap"
                      >
                        Clear
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setNewPlayerOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline">Add Athlete</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </div>
              </div>

              {/* CHECK 1 Player Attendance Grid (2-columns on Mac/desktop) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {players.map((player) => {
                  const pId = player._id?.toString() || "";
                  const present = isPlayerPresent(pId);
                  const isLocked = activeSession?.status === "closed";
                  const readyInfo = readyResults.find(
                    (r) => r.player._id?.toString() === pId
                  );
                  const initials = player.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={pId}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-xl border p-3.5 sm:p-4 transition-colors shadow-xs",
                        present
                          ? "border-zinc-700/80 bg-zinc-900/70"
                          : "border-zinc-800 bg-zinc-900/30"
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-mono font-semibold text-zinc-200">
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-100">
                              {player.name}
                            </p>
                            {readyInfo?.isReady && (
                              <CossBadge16 isReady={true} className="shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 font-normal">
                            {player.sport} · Age {player.age}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={cn(
                            "text-xs font-medium font-mono w-14 text-right",
                            present ? "text-zinc-200 font-semibold" : "text-zinc-500"
                          )}
                        >
                          {present ? "Present" : "Absent"}
                        </span>

                        <Switch
                          checked={present}
                          disabled={isLocked || !activeSession}
                          onCheckedChange={(checked) =>
                            handleToggleAttendance(pId, checked)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Athlete Dialog */}
              <Dialog open={newPlayerOpen} onOpenChange={setNewPlayerOpen}>
                <DialogPopup className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-zinc-100">
                      Enroll Athlete
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-400">
                      Register a new athlete in the {sport} roster.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddPlayer} className="space-y-4 pt-2">
                    <DialogPanel className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400 block">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                          placeholder="e.g. Ramesh Hansda"
                          required
                          className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400 block">
                          Age
                        </label>
                        <input
                          type="number"
                          value={newPlayerAge}
                          onChange={(e) => setNewPlayerAge(Number(e.target.value))}
                          min={10}
                          max={30}
                          required
                          className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                        />
                      </div>
                    </DialogPanel>
                    <DialogFooter variant="bare" className="flex gap-2 pt-2">
                      <DialogClose className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
                        Cancel
                      </DialogClose>
                      <button
                        type="submit"
                        className="flex-1 rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
                      >
                        Enroll
                      </button>
                    </DialogFooter>
                  </form>
                </DialogPopup>
              </Dialog>

              {/* Open Session Dialog */}
              <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
                <DialogPopup className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-zinc-100">
                      Open Training Session
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-400">
                      Create a new attendance roll for {sport}.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleOpenSession} className="space-y-4 pt-2">
                    <DialogPanel className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400 block">
                          Session Date
                        </label>
                        <input
                          type="date"
                          value={newSessionDate}
                          onChange={(e) => setNewSessionDate(e.target.value)}
                          required
                          className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                        />
                      </div>
                    </DialogPanel>
                    <DialogFooter variant="bare" className="flex gap-2 pt-2">
                      <DialogClose className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
                        Cancel
                      </DialogClose>
                      <button
                        type="submit"
                        className="flex-1 rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
                      >
                        Open Session
                      </button>
                    </DialogFooter>
                  </form>
                </DialogPopup>
              </Dialog>
            </div>
            </div>
          )}

          {/* TAB 3: MATCHES */}
          {activeTab === "matches" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Fixtures & Scoring</h2>
                  <p className="text-xs text-zinc-400">
                    {filteredMatches.length} recorded {filteredMatches.length === 1 ? "match" : "matches"} for {sport}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenMatchModal}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  Record Match
                </button>
              </div>

              {/* Record Match Dialog */}
              <Dialog open={newMatchOpen} onOpenChange={setNewMatchOpen}>
                <DialogPopup className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                      <Swords className="size-4 text-zinc-300" />
                      Record Match Score
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-400">
                      Score eligible players. Absent players on this date are restricted.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleRecordMatch} className="space-y-4 pt-2">
                    {matchError && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-900/60 p-3 text-xs text-red-400">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{matchError}</span>
                      </div>
                    )}

                    <DialogPanel className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-400 block">
                            Date
                          </label>
                          <input
                            type="date"
                            value={newMatchDate}
                            onChange={(e) => {
                              const date = e.target.value;
                              setNewMatchDate(date);
                              setMatchError(null);
                              // Re-compute selected players for new date
                              const updatedSelected: Record<string, boolean> = {};
                              players.forEach((p) => {
                                const pId = p._id?.toString() || "";
                                const isAbsent = isPlayerAbsentOnMatchDate(pId, date);
                                updatedSelected[pId] = !isAbsent;
                              });
                              setSelectedPlayers(updatedSelected);
                            }}
                            required
                            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-400 block">
                            Opponent
                          </label>
                          <input
                            type="text"
                            value={newMatchOpponent}
                            onChange={(e) => setNewMatchOpponent(e.target.value)}
                            placeholder="Opponent Club"
                            required
                            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-zinc-400 font-mono">
                            Player Scores
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            Absent players restricted
                          </span>
                        </div>

                        <div className="space-y-2">
                          {players.map((p) => {
                            const pId = p._id?.toString() || "";
                            const isAbsent = isPlayerAbsentOnMatchDate(
                              pId,
                              newMatchDate
                            );
                            const isChecked = selectedPlayers[pId] ?? false;
                            const currentScore = matchScores[pId] || 0;

                            return (
                              <div
                                key={pId}
                                className={cn(
                                  "flex items-center justify-between rounded-lg border p-3 transition-colors",
                                  isAbsent
                                    ? "border-zinc-800/80 bg-zinc-950/60"
                                    : isChecked
                                      ? "border-zinc-700 bg-zinc-900/80"
                                      : "border-zinc-800 bg-zinc-900/40"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked && !isAbsent}
                                    disabled={isAbsent}
                                    onChange={(e) =>
                                      setSelectedPlayers((prev) => ({
                                        ...prev,
                                        [pId]: e.target.checked,
                                      }))
                                    }
                                    className="size-4 rounded accent-zinc-100 bg-zinc-900 border-zinc-700 disabled:opacity-30 cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <p
                                      className={cn(
                                        "text-xs font-semibold truncate",
                                        isAbsent ? "text-zinc-400" : "text-zinc-200"
                                      )}
                                    >
                                      {p.name}
                                    </p>
                                    {isAbsent && (
                                      <span className="flex items-center gap-1 text-[11px] text-red-400 font-mono font-medium mt-0.5">
                                        <Lock className="size-3" />
                                        Ineligible (Absent)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* CHECK 2: Stepper is disabled if absent */}
                                <div className="shrink-0">
                                  <CossNumberField11
                                    value={currentScore}
                                    onValueChange={(val) => {
                                      if (isAbsent) return;
                                      setMatchScores((prev) => ({
                                        ...prev,
                                        [pId]: Math.max(0, val),
                                      }));
                                    }}
                                    disabled={isAbsent || !isChecked}
                                    min={0}
                                    max={99}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </DialogPanel>

                    <DialogFooter variant="bare" className="flex gap-2 pt-2">
                      <DialogClose className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
                        Cancel
                      </DialogClose>
                      <button
                        type="submit"
                        className="flex-1 rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
                      >
                        Save Match
                      </button>
                    </DialogFooter>
                  </form>
                </DialogPopup>
              </Dialog>

              {/* Match Fixtures Feed (Filtered by Active Sport) */}
              {filteredMatches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 space-y-2">
                  <Swords className="size-8 mx-auto text-zinc-600" />
                  <p className="text-xs font-mono">0 fixtures recorded for {sport}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMatches.map((m) => (
                    <div
                      key={m._id?.toString()}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 sm:p-4 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-100">
                          {m.opponent}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          {m.date}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-800/80">
                        {m.scores?.map((sc: any) => {
                          const targetPlayer = players.find(
                            (p) => p._id?.toString() === sc.playerId?.toString()
                          );
                          return (
                            <span
                              key={sc.playerId?.toString()}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs font-mono text-zinc-300"
                            >
                              <span>{targetPlayer?.name || "Player"}:</span>
                              <strong className="text-zinc-100 tabular-nums">
                                {sc.score}
                              </strong>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: READY BOARD */}
          {activeTab === "ready" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-100">Trial Readiness Board</h2>
                <span className="text-xs font-mono text-zinc-400">
                  {sportQualifiedCount} of {filteredReadyResults.length} qualified
                </span>
              </div>

              {/* Candidates Grid (Filtered by Active Sport) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReadyResults.map((item) => {
                  const pId = item.player._id?.toString() || "";
                  const isReady = item.isReady;
                  const initials = item.player.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={pId}
                      className={cn(
                        "rounded-xl border p-4 sm:p-5 space-y-3.5 transition-colors shadow-xs",
                        isReady
                          ? "border-emerald-500/30 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 shadow-[0_0_20px_-10px_rgba(16,185,129,0.2)]"
                          : "border-zinc-800 bg-zinc-900/40"
                      )}
                    >
                      {/* Header Row: Name & Coss Badge */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-200 font-semibold text-xs font-mono">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm sm:text-base font-semibold text-zinc-100 truncate">
                              {item.player.name}
                            </h3>
                            <p className="text-xs text-zinc-400 font-normal">
                              {item.player.sport} · Age {item.player.age}
                            </p>
                          </div>
                        </div>

                        <CossBadge16 isReady={isReady} />
                      </div>

                      {/* Attendance & Match Metrics Row (Option A) */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400">
                          <strong className="text-zinc-100 font-semibold">{item.attendancePct}%</strong> Attendance
                        </span>
                        <span className="text-zinc-400 flex items-center gap-1">
                          <strong className="text-zinc-100 font-semibold">{item.matchCount}/2</strong> Matches
                          {item.matchCount >= 2 && <Check className="size-3 text-zinc-100 stroke-[2.5]" />}
                        </span>
                      </div>

                      {/* Sleek Progress Bar with 75% Target Marker */}
                      <div className="relative h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            item.attendancePct >= 75 ? "bg-zinc-200" : "bg-zinc-500"
                          )}
                          style={{
                            width: `${Math.min(100, item.attendancePct)}%`,
                          }}
                        />
                        <div
                          className={cn(
                            "absolute top-0 bottom-0 w-0.5 z-10",
                            item.attendancePct >= 75 ? "bg-zinc-950" : "bg-zinc-400"
                          )}
                          style={{ left: "75%" }}
                          title="75% Target"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Fixed Mobile Bottom Navigation (< lg) */}
      <nav
        aria-label="Primary"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex items-stretch">
          {NAV_TABS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors cursor-pointer",
                    isActive
                      ? "text-zinc-100 font-semibold"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {isActive && (
                    <span className="absolute top-0 inset-x-3 h-0.5 bg-zinc-100 rounded-full" />
                  )}
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  {item.id === "ready" && qualifiedCount > 0 && (
                    <span className="absolute top-1.5 right-3 flex size-4 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-mono text-zinc-200 border border-zinc-700">
                      {qualifiedCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
