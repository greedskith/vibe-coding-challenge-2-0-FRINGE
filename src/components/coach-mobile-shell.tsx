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

type Tab = "attendance" | "roster" | "matches" | "ready";

export function CoachMobileShell() {
  const [activeTab, setActiveTab] = useState<Tab>("attendance");
  const [sport, setSport] = useState<string>("Football");
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [readyResults, setReadyResults] = useState<ReadyResult[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
      setLoading(true);
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
    } finally {
      setLoading(false);
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-zinc-950 text-zinc-50 select-none">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-sm font-bold tracking-tight text-zinc-100">
            Academy Desk
          </span>
          <Badge
            variant="outline"
            className="border-zinc-800 bg-zinc-900/60 text-[10px] text-zinc-400 font-mono py-0 px-2"
          >
            Coach
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <CossToggleGroup4
            value={sport}
            onValueChange={handleSportChange}
            options={[
              { value: "Football", label: "Football", shortLabel: "FB" },
              { value: "Cricket", label: "Cricket", shortLabel: "CR" },
            ]}
          />

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 px-4 pt-4 pb-24">
        {/* TAB 1: ATTENDANCE */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            {/* Session Date & Lock Header */}
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-zinc-200">
                    {activeSession?.date || "—"}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {activeSession?.sport} · {activeSession?.status === "closed" ? "Locked" : "Open"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeSession?.status === "closed" ? (
                  <Badge
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800/60 text-zinc-400 gap-1 text-[11px] font-mono py-1 px-2.5"
                  >
                    <Lock className="size-3 text-zinc-400" />
                    Locked
                  </Badge>
                ) : (
                  <button
                    type="button"
                    onClick={handleLockSession}
                    disabled={!activeSession}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 cursor-pointer disabled:opacity-40"
                  >
                    <Unlock className="size-3.5" />
                    Lock
                  </button>
                )}

                {/* Open Session Dialog (p-dialog-1) */}
                <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
                  <DialogTrigger
                    className="flex size-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
                    title="Open Session"
                  >
                    <Plus className="size-4" />
                  </DialogTrigger>
                  <DialogPopup className="sm:max-w-xs bg-zinc-950 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                      <DialogTitle className="text-base text-zinc-100">
                        Open Session
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        Open new session
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleOpenSession} className="space-y-4">
                      <DialogPanel className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-zinc-400 block mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={newSessionDate}
                            onChange={(e) => setNewSessionDate(e.target.value)}
                            required
                            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </DialogPanel>
                      <DialogFooter className="flex gap-2">
                        <DialogClose className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800">
                          Cancel
                        </DialogClose>
                        <button
                          type="submit"
                          className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
                        >
                          Open
                        </button>
                      </DialogFooter>
                    </form>
                  </DialogPopup>
                </Dialog>
              </div>
            </div>

            {/* 3 Elevated StatCards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
                  <UserCheck className="size-4" />
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums text-zinc-100">
                    {presentCount}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Present</div>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                  <UserX className="size-4" />
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums text-zinc-100">
                    {absentCount}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Absent</div>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums text-zinc-100">
                    {attendanceRate}%
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Rate</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-zinc-400 font-mono">
                Roster ({players.length})
              </span>
              {activeSession?.status !== "closed" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarkAll(true)}
                    className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer font-mono"
                  >
                    All present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAll(false)}
                    className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-400 hover:bg-zinc-700 transition-colors cursor-pointer font-mono"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* CHECK 1 Player Attendance List */}
            <ul className="flex flex-col gap-2.5">
              {players.map((player, idx) => {
                const pId = player._id?.toString() || "";
                const present = isPlayerPresent(pId);
                const isLocked = activeSession?.status === "closed";

                return (
                  <li
                    key={pId}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${
                      present
                        ? "border-emerald-500/20 bg-zinc-900/80"
                        : "border-zinc-800/80 bg-zinc-900/40"
                    }`}
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold tabular-nums text-xs font-mono ${
                        present
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-zinc-800/60 text-zinc-500"
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {player.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        {player.sport} · {player.age}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-semibold tabular-nums tracking-wide font-mono ${
                          present ? "text-emerald-400" : "text-zinc-500"
                        }`}
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
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* TAB 2: ROSTER */}
        {activeTab === "roster" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-100">Roster</h2>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {players.length} athletes
                </span>
              </div>

              {/* Add Athlete Dialog (p-dialog-1) */}
              <Dialog open={newPlayerOpen} onOpenChange={setNewPlayerOpen}>
                <DialogTrigger className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors cursor-pointer font-mono">
                  <Plus className="size-3.5" />
                  Add Athlete
                </DialogTrigger>
                <DialogPopup className="sm:max-w-xs bg-zinc-950 border-zinc-800 text-zinc-100">
                  <DialogHeader>
                    <DialogTitle className="text-base text-zinc-100">
                      Enroll Athlete
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Enroll athlete form
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddPlayer} className="space-y-4">
                    <DialogPanel className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-zinc-400 block mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                          placeholder="Athlete Name"
                          required
                          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-zinc-400 block mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          value={newPlayerAge}
                          onChange={(e) => setNewPlayerAge(Number(e.target.value))}
                          min={10}
                          max={30}
                          required
                          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </DialogPanel>
                    <DialogFooter className="flex gap-2">
                      <DialogClose className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800">
                        Cancel
                      </DialogClose>
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
                      >
                        Enroll
                      </button>
                    </DialogFooter>
                  </form>
                </DialogPopup>
              </Dialog>
            </div>

            {/* Roster Cards */}
            <div className="flex flex-col gap-2.5">
              {players.map((player, idx) => {
                const pId = player._id?.toString() || "";
                const readyInfo = readyResults.find(
                  (r) => r.player._id?.toString() === pId
                );

                return (
                  <div
                    key={pId}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 font-bold tabular-nums text-xs text-zinc-300 font-mono">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          {player.name}
                        </p>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          {player.sport} · {player.age}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-zinc-800 bg-zinc-950 text-zinc-400 text-[11px] font-mono py-1 px-2.5"
                      >
                        {readyInfo ? `${readyInfo.attendancePct}%` : "0%"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-zinc-800 bg-zinc-950 text-zinc-400 text-[11px] font-mono py-1 px-2.5"
                      >
                        {readyInfo ? `${readyInfo.matchCount}M` : "0M"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MATCHES */}
        {activeTab === "matches" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-100">Fixtures</h2>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {matches.length} matches
                </span>
              </div>

              <button
                type="button"
                onClick={handleOpenMatchModal}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors cursor-pointer font-mono"
              >
                <Plus className="size-3.5" />
                Record Match
              </button>
            </div>

            {/* Record Match Coss Dialog */}
            <Dialog open={newMatchOpen} onOpenChange={setNewMatchOpen}>
              <DialogPopup className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base text-zinc-100 flex items-center gap-2">
                    <Swords className="size-4 text-emerald-400" />
                    Record Match
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Score eligible players
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleRecordMatch} className="space-y-4">
                  {matchError && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-900/60 p-3 text-xs text-red-400">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{matchError}</span>
                    </div>
                  )}

                  <DialogPanel className="space-y-3.5">
                    <div>
                      <label className="text-xs font-medium text-zinc-400 block mb-1">
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
                        className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-zinc-400 block mb-1">
                        Opponent
                      </label>
                      <input
                        type="text"
                        value={newMatchOpponent}
                        onChange={(e) => setNewMatchOpponent(e.target.value)}
                        placeholder="Opponent"
                        required
                        className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-2">
                      <span className="text-xs font-medium text-zinc-400 block mb-2 font-mono">
                        Scores
                      </span>

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
                              className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
                                isAbsent
                                  ? "border-zinc-800/40 bg-zinc-950/40 opacity-40"
                                  : isChecked
                                  ? "border-zinc-700 bg-zinc-900/80"
                                  : "border-zinc-800 bg-zinc-900/40"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
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
                                  className="size-4 rounded accent-emerald-500 bg-zinc-900 border-zinc-700 disabled:opacity-30"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-zinc-200 truncate">
                                    {p.name}
                                  </p>
                                  {isAbsent && (
                                    <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono mt-0.5">
                                      <Lock className="size-2.5" />
                                      Ineligible (Absent)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* CHECK 2: Stepper is disabled if absent */}
                              <div className="w-28 shrink-0">
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

                  <DialogFooter className="flex gap-2 pt-2">
                    <DialogClose className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800">
                      Cancel
                    </DialogClose>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
                    >
                      Save
                    </button>
                  </DialogFooter>
                </form>
              </DialogPopup>
            </Dialog>

            {/* Match Fixtures Feed */}
            {matches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800/80 p-8 text-center text-zinc-500">
                <Swords className="size-8 mx-auto mb-2 text-zinc-600" />
                <span className="text-xs font-mono">0 fixtures</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {matches.map((m) => (
                  <div
                    key={m._id?.toString()}
                    className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-100">
                        vs {m.opponent}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {m.sport} · {m.date}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-800/60">
                      {m.scores?.map((sc: any) => {
                        const targetPlayer = players.find(
                          (p) => p._id?.toString() === sc.playerId?.toString()
                        );
                        return (
                          <span
                            key={sc.playerId?.toString()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] font-mono text-zinc-300"
                          >
                            <span>{targetPlayer?.name || "Player"}:</span>
                            <span className="font-bold text-emerald-400 tabular-nums">
                              {sc.score}
                            </span>
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
              <div>
                <h2 className="text-base font-bold text-zinc-100">Ready Board</h2>
                <span className="text-[11px] text-zinc-500 font-mono">
                  ≥75% · 2M
                </span>
              </div>
            </div>

            {/* Candidates Feed */}
            <div className="flex flex-col gap-3">
              {readyResults.map((item) => {
                const pId = item.player._id?.toString() || "";
                const isReady = item.isReady;

                return (
                  <div
                    key={pId}
                    className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                      isReady
                        ? "border-emerald-500/40 bg-zinc-900/80"
                        : "border-zinc-800/80 bg-zinc-900/40"
                    }`}
                  >
                    {/* Header Row: Name & Coss Badge */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">
                          {item.player.name}
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          {item.player.sport} · {item.player.age}
                        </p>
                      </div>

                      {/* Coss p-badge-16 */}
                      <CossBadge16 isReady={isReady} />
                    </div>

                    {/* 75% Tick Threshold Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">
                          <strong className="text-zinc-200">
                            {item.attendancePct}%
                          </strong>{" "}
                          ({item.sessionsPresent}/{item.sessionsHeld})
                        </span>
                        <span
                          className={
                            item.attendancePct >= 75
                              ? "text-emerald-400 font-semibold"
                              : "text-zinc-500"
                          }
                        >
                          75% |
                        </span>
                      </div>

                      {/* Progress bar container with 75% vertical tick mark */}
                      <div className="relative h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                        {/* 75% tick marker */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-zinc-100 z-10"
                          style={{ left: "75%" }}
                          title="75%"
                        />
                        {/* Fill bar */}
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.attendancePct >= 75
                              ? "bg-emerald-500"
                              : "bg-amber-500/70"
                          }`}
                          style={{
                            width: `${Math.min(100, item.attendancePct)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Criteria Badges Footer */}
                    <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="size-3 text-zinc-500" />
                        <span
                          className={
                            item.matchCount >= 2
                              ? "text-emerald-400 font-semibold"
                              : "text-zinc-400"
                          }
                        >
                          {item.matchCount}/2
                        </span>
                      </div>

                      <div>
                        {isReady ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="size-3" />
                          </span>
                        ) : (
                          <span className="text-zinc-600 font-mono">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Fixed BottomNav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900 bg-zinc-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-md items-stretch">
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setActiveTab("attendance")}
              className={`flex w-full flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === "attendance"
                  ? "text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ClipboardCheck className="size-5" />
              Attendance
            </button>
          </li>

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setActiveTab("roster")}
              className={`flex w-full flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === "roster"
                  ? "text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Users className="size-5" />
              Roster
            </button>
          </li>

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setActiveTab("matches")}
              className={`flex w-full flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === "matches"
                  ? "text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Trophy className="size-5" />
              Matches
            </button>
          </li>

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setActiveTab("ready")}
              className={`flex w-full flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === "ready"
                  ? "text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Sparkles className="size-5" />
              Ready
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
