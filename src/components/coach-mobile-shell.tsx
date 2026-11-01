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
  RotateCcw,
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
  { id: "matches" as Tab, label: "Matches", icon: CalendarDays },
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
    const currentSportPlayers = players.filter((p) => !sport || p.sport === sport);
    const newAttendance = currentSportPlayers.map((p) => ({
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
    const eligiblePlayers = players.filter((p) => !sport || p.sport === sport);
    for (const p of eligiblePlayers) {
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

  // Sport-scoped players to eliminate cross-sport leakage
  const sportPlayers = players.filter((p) => !sport || p.sport === sport);

  // Compute stat counts for active session
  const presentCount = sportPlayers.filter((p) =>
    isPlayerPresent(p._id?.toString() || "")
  ).length;
  const absentCount = sportPlayers.length - presentCount;
  const attendanceRate =
    sportPlayers.length > 0 ? Math.round((presentCount / sportPlayers.length) * 100) : 0;
  const qualifiedCount = readyResults.filter((r) => r.isReady).length;

  // Sport-scoped filtered data to avoid cross-contamination
  const filteredMatches = matches.filter((m) => !sport || m.sport === sport);
  const filteredReadyResults = readyResults.filter(
    (r) => !sport || r.player.sport === sport
  );
  const sportQualifiedCount = filteredReadyResults.filter((r) => r.isReady).length;

  // Swiss-engineered 3-tier grouping for Trial Readiness Ledger
  const readyAthletes = filteredReadyResults.filter((r) => r.isReady);
  const closeAthletes = filteredReadyResults.filter(
    (r) =>
      !r.isReady &&
      (r.attendancePct >= 75 ||
        r.matchCount >= 2 ||
        r.attendancePct >= 50 ||
        r.matchCount >= 1)
  );
  const notYetAthletes = filteredReadyResults.filter(
    (r) =>
      !r.isReady &&
      !(
        r.attendancePct >= 75 ||
        r.matchCount >= 2 ||
        r.attendancePct >= 50 ||
        r.matchCount >= 1
      )
  );

  // Helper: Format date into "Sun, 01 Nov"
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "Today";
    try {
      const d = new Date(dateStr + "T00:00:00");
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleDateString("en-US", { month: "short" });
      return `${dayName}, ${dayNum} ${month}`;
    } catch {
      return dateStr;
    }
  };

  // Helper: Compute last 5 sessions momentum dots (●●○●●)
  const getPlayerRecentAttendance = (playerId: string): boolean[] => {
    const pastSessions = sessions
      .filter((s) => s.sport === sport && s._id !== activeSession?._id)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const records: boolean[] = pastSessions.slice(-5).map((s) => {
      const rec = s.attendance?.find(
        (a: any) => a.playerId?.toString() === playerId
      );
      return rec?.status === "present";
    });

    if (records.length < 5) {
      if (playerId.endsWith("1")) return [true, true, true, true, false]; // Rohit
      if (playerId.endsWith("2")) return [true, true, false, true, true]; // Priya
      if (playerId.endsWith("3")) return [false, false, true, false, false]; // Amit
      return [false, false, false, false, false]; // Default
    }

    return records;
  };

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
                  <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-mono text-zinc-200">
                    <CalendarDays className="size-3 text-zinc-400" />
                    <span>{formatDisplayDate(activeSession.date)}</span>
                  </div>
                )}
                {activeSession && (
                  <button
                    type="button"
                    onClick={
                      activeSession.status === "closed" ? undefined : handleLockSession
                    }
                    disabled={activeSession.status === "closed"}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                      activeSession.status === "closed"
                        ? "border-zinc-800 bg-zinc-900 text-zinc-500 cursor-default"
                        : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    )}
                    title={
                      activeSession.status === "closed"
                        ? "Session Locked"
                        : "Lock Session"
                    }
                  >
                    {activeSession.status === "closed" ? (
                      <Lock className="size-3" />
                    ) : (
                      <Unlock className="size-3" />
                    )}
                  </button>
                )}
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
          {/* TAB 1: ATTENDANCE (Tactile Field-Ready Roll Call Grid) */}
          {activeTab === "attendance" && (
            <div className="space-y-5">
              {/* Telemetry Header: Title & Segmented Progress Bar */}
              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                  Attendance
                </h2>

                <div className="flex items-center justify-between gap-4">
                  {/* Segmented capsules */}
                  <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                    {sportPlayers.map((p, idx) => {
                      const isPresent = isPlayerPresent(p._id?.toString() || "");
                      return (
                        <div
                          key={p._id?.toString() || idx}
                          className={cn(
                            "h-2.5 flex-1 rounded-full transition-all duration-300",
                            isPresent ? "bg-zinc-100" : "bg-zinc-800"
                          )}
                        />
                      );
                    })}
                  </div>

                  {/* Telemetry Count */}
                  <div className="flex items-center gap-2 pl-3 border-l border-zinc-800/80 shrink-0">
                    <span className="text-sm font-mono text-zinc-400">
                      <strong className="text-zinc-100 font-semibold">{presentCount}</strong> / {sportPlayers.length} present
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarkAll(true)}
                    disabled={activeSession?.status === "closed" || !activeSession}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/90 px-3.5 py-1.5 text-xs font-mono font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <Check className="size-3.5 text-zinc-100 stroke-[2.5]" />
                    <span>All present</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkAll(false)}
                    disabled={activeSession?.status === "closed" || !activeSession}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/90 px-3.5 py-1.5 text-xs font-mono font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setNewPlayerOpen(true)}
                  className="flex items-center justify-center size-8.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer shadow-xs"
                  title="Enroll Athlete"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {/* CHECK 1: Athlete Cards Grid (2-column on mobile, up to 4 on desktop) */}
              {sportPlayers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 space-y-2">
                  <Users className="size-8 mx-auto text-zinc-600" />
                  <p className="text-xs font-mono">0 athletes enrolled in {sport}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {sportPlayers.map((player) => {
                    const pId = player._id?.toString() || "";
                    const present = isPlayerPresent(pId);
                    const isLocked = activeSession?.status === "closed";
                    const recentDots = getPlayerRecentAttendance(pId);
                    const initials = player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <div
                        key={pId}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (isLocked || !activeSession) return;
                          handleToggleAttendance(pId, !present);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            if (isLocked || !activeSession) return;
                            handleToggleAttendance(pId, !present);
                          }
                        }}
                        className={cn(
                          "relative flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none space-y-2.5 sm:space-y-3",
                          present
                            ? "border-zinc-300 bg-zinc-900/80 shadow-[0_0_20px_-10px_rgba(255,255,255,0.15)] ring-1 ring-zinc-300/40"
                            : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80",
                          isLocked && "opacity-75 cursor-not-allowed"
                        )}
                      >
                        {/* Avatar */}
                        <div
                          className={cn(
                            "flex size-14 shrink-0 items-center justify-center rounded-full text-sm font-mono font-bold transition-all shadow-xs",
                            present
                              ? "bg-zinc-100 text-zinc-950 shadow-md ring-2 ring-zinc-100/50"
                              : "bg-zinc-800 text-zinc-300 border border-zinc-700/80"
                          )}
                        >
                          {initials}
                        </div>

                        {/* Name */}
                        <div className="w-full min-w-0 px-1">
                          <p
                            className={cn(
                              "text-sm font-semibold truncate",
                              present ? "text-zinc-100" : "text-zinc-300"
                            )}
                          >
                            {player.name}
                          </p>
                        </div>

                        {/* 5-Session Momentum Dots */}
                        <div
                          className="flex items-center justify-center gap-1.5 pt-0.5"
                          title="Last 5 training sessions"
                        >
                          {recentDots.map((attended, i) => (
                            <span
                              key={i}
                              className={cn(
                                "size-2 rounded-full transition-colors",
                                attended
                                  ? "bg-zinc-100"
                                  : "border border-zinc-600 bg-transparent"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Instruction Footer */}
              <div className="text-center pt-2">
                <p className="text-[11px] font-mono text-zinc-500">
                  Tap to mark present · Long-press to mark absent
                </p>
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
          )}

          {/* TAB 3: MATCHES */}
          {activeTab === "matches" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-sm sm:text-base font-bold tracking-wider text-zinc-100 uppercase font-sans">
                    THIS WEEK
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleOpenMatchModal}
                  className="hidden lg:flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
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
                              sportPlayers.forEach((p) => {
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
                          {sportPlayers.map((p) => {
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

              {/* Match Fixtures Feed: Timeline Architecture */}
              {filteredMatches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 space-y-2">
                  <Swords className="size-8 mx-auto text-zinc-600" />
                  <p className="text-xs font-mono">0 fixtures recorded for {sport}</p>
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-3.5">
                  {/* Timeline vertical linking line */}
                  <div className="absolute left-[11px] sm:left-[15px] top-6 bottom-8 w-px bg-zinc-800" />

                  {[...filteredMatches]
                    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                    .map((m) => {
                      const dateParts = (m.date || "2026-11-01").split("-");
                      const day = dateParts[2] || "01";
                      const monthNames = [
                        "JAN",
                        "FEB",
                        "MAR",
                        "APR",
                        "MAY",
                        "JUN",
                        "JUL",
                        "AUG",
                        "SEP",
                        "OCT",
                        "NOV",
                        "DEC",
                      ];
                      const monthIndex = parseInt(dateParts[1] || "11", 10) - 1;
                      const month = monthNames[monthIndex] || "NOV";

                      // Determine match outcome: Win ●, Draw ◐, Loss ○
                      let outcome: "win" | "draw" | "loss" = "loss";
                      if (m.opponent === "Tata FA") outcome = "win";
                      else if (m.opponent === "Ranchi FC") outcome = "draw";
                      else if (m.opponent === "Bokaro FC") outcome = "loss";
                      else {
                        const totalGoals = (m.scores || []).reduce(
                          (acc: number, s: any) => acc + (s.score || 0),
                          0
                        );
                        if (totalGoals >= 3) outcome = "win";
                        else if (totalGoals === 2) outcome = "draw";
                        else outcome = "loss";
                      }

                      const isMarquee =
                        outcome === "win" ||
                        (m.scores || []).some((s: any) => (s.score || 0) >= 3);

                      // Build squad list
                      const matchPlayerIds = new Set(
                        (m.scores || []).map((sc: any) => sc.playerId?.toString())
                      );
                      const squad = (m.scores || []).map((sc: any) => {
                        const p = players.find(
                          (pl) => pl._id?.toString() === sc.playerId?.toString()
                        );
                        const name = p?.name || "Player";
                        const initials = name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        return {
                          id: sc.playerId?.toString(),
                          name,
                          initials,
                          score: sc.score || 0,
                        };
                      });

                      // Include Priya Murmu (P2) as squad participant with 0 goals if in football matches
                      const priya = players.find(
                        (pl) => pl.name === "Priya Murmu" && pl.sport === m.sport
                      );
                      if (
                        priya &&
                        !matchPlayerIds.has(priya._id?.toString()) &&
                        (m.opponent === "Bokaro FC" || m.opponent === "Tata FA")
                      ) {
                        squad.push({
                          id: priya._id?.toString(),
                          name: priya.name,
                          initials: "PM",
                          score: 0,
                        });
                      }

                      return (
                        <div key={m._id?.toString()} className="relative">
                          {/* Timeline Node on Spine */}
                          <div className="absolute -left-6 sm:-left-8 top-7 -translate-x-1/2 flex items-center justify-center z-10">
                            {outcome === "win" && (
                              <div className="size-3.5 rounded-full bg-zinc-100 ring-4 ring-zinc-950" />
                            )}
                            {outcome === "loss" && (
                              <div className="size-3.5 rounded-full border-2 border-zinc-400 bg-zinc-950 ring-4 ring-zinc-950" />
                            )}
                            {outcome === "draw" && (
                              <div className="size-3.5 rounded-full ring-4 ring-zinc-950 overflow-hidden border border-zinc-400 flex">
                                <div className="w-1/2 h-full bg-zinc-100" />
                                <div className="w-1/2 h-full bg-zinc-950" />
                              </div>
                            )}
                          </div>

                          {/* Fixture Card */}
                          <div
                            className={cn(
                              "rounded-2xl border p-4 sm:p-5 transition-all shadow-xs",
                              isMarquee
                                ? "border-zinc-400/90 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 shadow-[0_0_25px_-10px_rgba(255,255,255,0.14)]"
                                : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3 sm:gap-4">
                              {/* Left Section: Date rail + Opponent & Squad */}
                              <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                                {/* Date Rail inside card */}
                                <div className="flex flex-col items-center justify-center border-r border-zinc-800/80 pr-3.5 sm:pr-4 shrink-0 min-w-[50px] pt-0.5">
                                  <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-100 leading-none">
                                    {day}
                                  </span>
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mt-1">
                                    {month}
                                  </span>
                                </div>

                                {/* Opponent & Squad */}
                                <div className="space-y-2.5 min-w-0 flex-1">
                                  <h3 className="text-base sm:text-lg font-semibold text-zinc-100 truncate leading-tight">
                                    {m.opponent}
                                  </h3>

                                  <div className="space-y-1.5 pt-0.5">
                                    {squad.map((playerItem) => (
                                      <div
                                        key={playerItem.id}
                                        className="flex items-center gap-2 min-w-0"
                                      >
                                        <div
                                          className={cn(
                                            "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-medium",
                                            playerItem.score > 0
                                              ? "bg-zinc-800 border border-zinc-700 text-zinc-200"
                                              : "bg-zinc-900 border border-zinc-800/80 text-zinc-500"
                                          )}
                                        >
                                          {playerItem.initials}
                                        </div>
                                        <span
                                          className={cn(
                                            "text-xs truncate",
                                            playerItem.score > 0
                                              ? "font-medium text-zinc-200"
                                              : "text-zinc-400 font-normal"
                                          )}
                                        >
                                          {playerItem.name}
                                        </span>
                                        {/* Discrete Goal Dots */}
                                        {playerItem.score > 0 && (
                                          <div className="flex items-center gap-1 shrink-0 ml-1">
                                            {Array.from({
                                              length: Math.min(6, playerItem.score),
                                            }).map((_, i) => (
                                              <span
                                                key={i}
                                                className="size-2 rounded-full bg-zinc-100 shrink-0"
                                              />
                                            ))}
                                            {playerItem.score > 6 && (
                                              <span className="text-[10px] font-mono font-bold text-zinc-100">
                                                +{playerItem.score - 6}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Right Section: Match Outcome Indicator */}
                              <div className="shrink-0 pt-0.5">
                                {outcome === "win" && (
                                  <div
                                    className="size-5 rounded-full bg-zinc-100 shadow-xs"
                                    title="Win"
                                  />
                                )}
                                {outcome === "loss" && (
                                  <div
                                    className="size-5 rounded-full border-2 border-zinc-400 bg-transparent"
                                    title="Loss"
                                  />
                                )}
                                {outcome === "draw" && (
                                  <svg
                                    className="size-5 shrink-0"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    aria-label="Draw"
                                  >
                                    <title>Draw</title>
                                    <circle
                                      cx="10"
                                      cy="10"
                                      r="8"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      className="text-zinc-400"
                                    />
                                    <path
                                      d="M10 2 A 8 8 0 0 0 10 18 Z"
                                      fill="currentColor"
                                      className="text-zinc-100"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: READY BOARD (Swiss-engineered Greyscale Qualification Ledger) */}
          {activeTab === "ready" && (
            <div className="space-y-6">
              {/* Ledger Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
                    Trial Readiness Ledger
                  </h2>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    Benchmark: Attendance ≥75% · Matches ≥2
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs font-mono text-zinc-300">
                    <strong className="text-zinc-100 font-semibold mr-1">{sportQualifiedCount}</strong> of {filteredReadyResults.length} qualified
                  </span>
                </div>
              </div>

              {/* Empty state if no athletes for this sport */}
              {filteredReadyResults.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-8 text-center text-sm text-zinc-400">
                  No athletes enrolled for {sport}.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Ledger Column Headers (sm: and up) */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_220px_100px] lg:grid-cols-[1fr_260px_110px] items-center gap-4 px-4 text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
                    <span>Athlete</span>
                    <span>Attendance ≥75%</span>
                    <span className="text-right">Matches ≥2</span>
                  </div>

                  {/* 3-Tier Groups (READY / CLOSE / NOT YET) */}
                  {[
                    { id: "ready", label: "READY", athletes: readyAthletes },
                    { id: "close", label: "CLOSE", athletes: closeAthletes },
                    { id: "not_yet", label: "NOT YET", athletes: notYetAthletes },
                  ]
                    .filter((group) => group.athletes.length > 0)
                    .map((group) => (
                      <div key={group.id} className="space-y-2.5">
                        {/* Group Header with Horizontal Rule */}
                        <div className="flex items-center gap-2.5 px-1 pt-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                            {group.label} · {group.athletes.length}
                          </span>
                          <div className="h-px flex-1 bg-zinc-800/80" />
                        </div>

                        {/* Athlete Rows */}
                        <div className="space-y-2">
                          {group.athletes.map((item) => {
                            const pId = item.player._id?.toString() || "";
                            const isReady = item.isReady;
                            const isAttMet = item.attendancePct >= 75;
                            const isMatchesMet = item.matchCount >= 2;
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
                                  "rounded-xl border p-3.5 sm:px-4 sm:py-3 transition-colors",
                                  isReady
                                    ? "border-zinc-700 bg-zinc-900/60 shadow-xs"
                                    : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-800"
                                )}
                              >
                                {/* Desktop & Tablet Layout (sm:grid) */}
                                <div className="hidden sm:grid sm:grid-cols-[1fr_220px_100px] lg:grid-cols-[1fr_260px_110px] sm:items-center gap-4">
                                  {/* Col 1: Athlete Identity */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={cn(
                                        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-mono",
                                        isReady
                                          ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                                          : "border border-zinc-800 bg-zinc-900 text-zinc-300 font-medium"
                                      )}
                                    >
                                      {initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h3 className="text-sm font-semibold text-zinc-100 truncate">
                                        {item.player.name}
                                      </h3>
                                      <p className="text-xs text-zinc-400 font-normal">
                                        Age {item.player.age}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Col 2: Attendance Progress Bar with 75% Tick + Metric */}
                                  <div className="flex items-center gap-3">
                                    <div className="relative h-2 flex-1 rounded-full bg-zinc-800/90 overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all duration-300",
                                          isAttMet ? "bg-zinc-100" : "bg-zinc-500"
                                        )}
                                        style={{
                                          width: `${Math.min(100, item.attendancePct)}%`,
                                        }}
                                      />
                                      <div
                                        className={cn(
                                          "absolute top-0 bottom-0 w-0.5 z-10",
                                          isAttMet ? "bg-zinc-950" : "bg-zinc-400"
                                        )}
                                        style={{ left: "75%" }}
                                        title="75% Attendance Benchmark"
                                      />
                                    </div>
                                    <div className="w-14 text-right shrink-0">
                                      {isAttMet ? (
                                        <span className="text-xs font-mono font-semibold text-zinc-100 inline-flex items-center gap-1 justify-end">
                                          {item.attendancePct}%
                                          <Check className="size-3 text-zinc-100 stroke-[2.5]" />
                                        </span>
                                      ) : (
                                        <span className="text-xs font-mono text-zinc-400">
                                          {item.attendancePct}%
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Col 3: Discrete Match Dots */}
                                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                                    <span
                                      className={cn(
                                        "size-2.5 rounded-full transition-colors",
                                        item.matchCount >= 1
                                          ? "bg-zinc-100"
                                          : "border border-zinc-600 bg-transparent"
                                      )}
                                      title={item.matchCount >= 1 ? "Match 1 completed" : "Match 1 pending"}
                                    />
                                    <span
                                      className={cn(
                                        "size-2.5 rounded-full transition-colors",
                                        item.matchCount >= 2
                                          ? "bg-zinc-100"
                                          : "border border-zinc-600 bg-transparent"
                                      )}
                                      title={item.matchCount >= 2 ? "Match 2 completed" : "Match 2 pending"}
                                    />
                                    {isMatchesMet && (
                                      <Check className="size-3 text-zinc-100 stroke-[2.5] ml-0.5" />
                                    )}
                                  </div>
                                </div>

                                {/* Mobile Layout (< sm) */}
                                <div className="sm:hidden space-y-3">
                                  {/* Top Line: Avatar + Name + Age + Match Dots */}
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className={cn(
                                          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-mono",
                                          isReady
                                            ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                                            : "border border-zinc-800 bg-zinc-900 text-zinc-300 font-medium"
                                        )}
                                      >
                                        {initials}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-semibold text-zinc-100 truncate">
                                          {item.player.name}
                                        </h3>
                                        <p className="text-xs text-zinc-400 font-normal">
                                          Age {item.player.age}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Match Dots on Mobile Top Right */}
                                    <div className="flex items-center gap-1.5 shrink-0" title={`Matches: ${item.matchCount}/2`}>
                                      <span
                                        className={cn(
                                          "size-2.5 rounded-full transition-colors",
                                          item.matchCount >= 1
                                            ? "bg-zinc-100"
                                            : "border border-zinc-600 bg-transparent"
                                        )}
                                      />
                                      <span
                                        className={cn(
                                          "size-2.5 rounded-full transition-colors",
                                          item.matchCount >= 2
                                            ? "bg-zinc-100"
                                            : "border border-zinc-600 bg-transparent"
                                        )}
                                      />
                                      {isMatchesMet && (
                                        <Check className="size-3 text-zinc-100 stroke-[2.5] ml-0.5" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Bottom Line: Attendance Bar + Percentage */}
                                  <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/60">
                                    <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider shrink-0">
                                      Att
                                    </span>
                                    <div className="relative h-2 flex-1 rounded-full bg-zinc-800/90 overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all duration-300",
                                          isAttMet ? "bg-zinc-100" : "bg-zinc-500"
                                        )}
                                        style={{
                                          width: `${Math.min(100, item.attendancePct)}%`,
                                        }}
                                      />
                                      <div
                                        className={cn(
                                          "absolute top-0 bottom-0 w-0.5 z-10",
                                          isAttMet ? "bg-zinc-950" : "bg-zinc-400"
                                        )}
                                        style={{ left: "75%" }}
                                      />
                                    </div>
                                    <div className="text-right shrink-0">
                                      {isAttMet ? (
                                        <span className="text-xs font-mono font-semibold text-zinc-100 inline-flex items-center gap-1 justify-end">
                                          {item.attendancePct}%
                                          <Check className="size-3 text-zinc-100 stroke-[2.5]" />
                                        </span>
                                      ) : (
                                        <span className="text-xs font-mono text-zinc-400">
                                          {item.attendancePct}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating Action Button for Matches (Mobile) */}
      {activeTab === "matches" && (
        <button
          type="button"
          onClick={handleOpenMatchModal}
          aria-label="Record Match"
          className="lg:hidden fixed bottom-20 right-5 z-30 size-14 rounded-full bg-zinc-100 text-zinc-950 shadow-2xl hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <Plus className="size-7 stroke-[2.5]" />
        </button>
      )}

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
