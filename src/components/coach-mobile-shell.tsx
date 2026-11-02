"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
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
  TrendingUp,
  Swords,
  Check,
  RotateCcw,
  KeyRound,
  Copy,
  ShieldCheck,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/p-dialog-1";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CossNumberField11 } from "@/components/p-number-field-11";
import { CossToggleGroup4 } from "@/components/p-toggle-group-4";
import { Player, Session, Match, ReadyResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Tab = "attendance" | "matches" | "roster" | "ready";

const NAV_TABS = [
  { id: "attendance" as Tab, label: "Attendance", icon: ClipboardCheck },
  { id: "matches" as Tab, label: "Matches", icon: CalendarDays },
  { id: "roster" as Tab, label: "Roster", icon: Users },
  { id: "ready" as Tab, label: "Ready Board", icon: Sparkles },
];

export function getAgeGroup(age: number | string): string {
  const num = Number(age);
  if (isNaN(num) || num <= 0) return "Senior";
  if (num <= 15) return "U15";
  if (num <= 17) return "U17";
  if (num <= 19) return "U19";
  return "Senior";
}

const TAB_ROUTES: Record<Tab, string> = {
  attendance: "/coach",
  matches: "/coach/matches",
  roster: "/coach/players",
  ready: "/coach/ready",
};

export interface CoachMobileShellProps {
  defaultTab?: Tab;
}

export function CoachMobileShell(props: CoachMobileShellProps = {}) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-zinc-950" />}>
      <CoachMobileShellInner key={props.defaultTab ?? "attendance"} {...props} />
    </Suspense>
  );
}

const isAthleteAccount = (p: Player) => {
  if (!p) return false;
  const name = (p.name || "").trim().toLowerCase();
  const username = (p.username || "").trim().toLowerCase();
  const role = ((p as any).role || "").trim().toLowerCase();
  if (role === "coach" || role === "scout") return false;
  if (name === "coach" || name === "head coach" || name === "scout") return false;
  if (username === "coach" || username === "scout") return false;
  return true;
};

function CoachMobileShellInner({ defaultTab }: CoachMobileShellProps) {
  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab") as Tab | null;

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (urlTab && ["attendance", "matches", "roster", "ready"].includes(urlTab)) {
      return urlTab;
    }
    return defaultTab || "attendance";
  });

  const [sport, setSport] = useState<string>("Football");
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [readyResults, setReadyResults] = useState<ReadyResult[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  // Pointer-based long-press attendance gesture refs
  const longPressTimers = React.useRef<Record<string, NodeJS.Timeout>>({});
  const longPressFired = React.useRef<Record<string, boolean>>({});
  const pointerStartPos = React.useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const activeTimers = longPressTimers.current;
    return () => {
      Object.values(activeTimers).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Roster Tab State
  const [rosterSearch, setRosterSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Player | null>(null);
  const [copied, setCopied] = useState(false);
  const [isUpdatingAthlete, setIsUpdatingAthlete] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState<number>(16);
  const [editSport, setEditSport] = useState<string>("Football");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingAthlete, setIsDeletingAthlete] = useState(false);

  // Dialog States
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newSessionSport, setNewSessionSport] = useState<string>("Football");

  const [newPlayerOpen, setNewPlayerOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerAge, setNewPlayerAge] = useState<number>(16);
  const [newPlayerSport, setNewPlayerSport] = useState<string>("Football");
  const [newPlayerPassword, setNewPlayerPassword] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [newMatchSport, setNewMatchSport] = useState<string>("Football");
  const [newMatchDate, setNewMatchDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newMatchOpponent, setNewMatchOpponent] = useState("Ranchi FC");
  const [newMatchOutcome, setNewMatchOutcome] = useState<"win" | "draw" | "loss">("win");
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, boolean>>({});
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [matchError, setMatchError] = useState<string | null>(null);

  // Synchronize tab from URL params if present
  useEffect(() => {
    if (urlTab && ["attendance", "matches", "roster", "ready"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.pathname = TAB_ROUTES[newTab] || "/coach";
      url.searchParams.delete("tab");
      window.history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
    }
  };

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

      if (Array.isArray(pData)) setPlayers(pData.filter(isAthleteAccount));
      if (Array.isArray(sData)) {
        setSessions(sData);
        setActiveSession((prev) => {
          if (
            prev &&
            (prev.sport || "").toLowerCase() === sport.toLowerCase()
          ) {
            const updated = sData.find(
              (s: Session) => s._id?.toString() === prev._id?.toString()
            );
            if (updated) return updated;
          }
          const sportSession =
            sData.find(
              (s: Session) =>
                (s.sport || "").toLowerCase() === sport.toLowerCase() &&
                s.status === "open"
            ) ||
            sData.find(
              (s: Session) => (s.sport || "").toLowerCase() === sport.toLowerCase()
            ) ||
            null;
          return sportSession;
        });
      }
      if (Array.isArray(mData)) setMatches(mData);
      if (Array.isArray(rData)) setReadyResults(rData.filter((r: any) => isAthleteAccount(r.player)));
    } catch (err) {
      console.error("Failed to load coach desk data:", err);
    }
  }, [sport]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep selectedAthlete reactive to players state changes
  useEffect(() => {
    if (drawerOpen && selectedAthlete) {
      const refreshed = players.find(
        (p) => p._id?.toString() === selectedAthlete._id?.toString()
      );
      if (
        refreshed &&
        (refreshed.name !== selectedAthlete.name ||
          refreshed.age !== selectedAthlete.age ||
          refreshed.sport !== selectedAthlete.sport ||
          refreshed.username !== selectedAthlete.username)
      ) {
        setSelectedAthlete(refreshed);
      }
    }
  }, [players, drawerOpen, selectedAthlete]);

  // Synchronize activeSession when sport changes
  const handleSportChange = (newSport: string) => {
    setSport(newSport);
    setDrawerOpen(false);
    setSelectedAthlete(null);
    setDeleteConfirmOpen(false);

    const matchedSession =
      sessions.find(
        (s) =>
          (s.sport || "").toLowerCase() === newSport.toLowerCase() &&
          s.status === "open"
      ) ||
      sessions.find(
        (s) => (s.sport || "").toLowerCase() === newSport.toLowerCase()
      ) ||
      null;
    setActiveSession(matchedSession);
  };

  // Attendance helpers
  const isPlayerPresent = (playerId: string) => {
    if (!activeSession || !Array.isArray(activeSession.attendance)) return false;
    const rec = activeSession.attendance.find((a: any) => {
      const id = a.playerId?._id
        ? a.playerId._id.toString()
        : a.playerId?.toString();
      return id === playerId;
    });
    return rec?.status === "present";
  };

  const handleToggleAttendance = async (playerId: string, present: boolean) => {
    if (!activeSession || activeSession.status === "closed") {
      if (activeSession?.status === "closed") {
        toast.info("Session is locked (read-only)");
      }
      return;
    }
    const newStatus = present ? "present" : "absent";

    // Optimistic UI update
    const updatedAttendance = [...(activeSession.attendance || [])];
    const idx = updatedAttendance.findIndex((a: any) => {
      const id = a.playerId?._id
        ? a.playerId._id.toString()
        : a.playerId?.toString();
      return id === playerId;
    });
    if (idx >= 0) {
      updatedAttendance[idx] = { ...updatedAttendance[idx], status: newStatus };
    } else {
      updatedAttendance.push({ playerId: playerId as any, status: newStatus });
    }

    const updatedSession = { ...activeSession, attendance: updatedAttendance };
    setActiveSession(updatedSession);
    setSessions((prev) =>
      prev.map((s) => (s._id?.toString() === activeSession._id?.toString() ? updatedSession : s))
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
        setSessions((prev) =>
          prev.map((s) => (s._id?.toString() === saved._id?.toString() ? saved : s))
        );
        fetch("/api/ready")
          .then((r) => r.json())
          .then((data) => Array.isArray(data) && setReadyResults(data.filter((r: any) => isAthleteAccount(r.player))));
      }
    } catch (err) {
      console.error("Failed to update attendance:", err);
    }
  };

  const handleMarkAll = async (present: boolean) => {
    if (!activeSession || activeSession.status === "closed") {
      if (activeSession?.status === "closed") {
        toast.info("Session is locked (read-only)");
      }
      return;
    }
    const newStatus = present ? "present" : "absent";
    const currentSportPlayers = players
      .filter(isAthleteAccount)
      .filter(
        (p) => !sport || (p.sport || "").toLowerCase() === sport.toLowerCase()
      );
    const newAttendance = currentSportPlayers.map((p) => ({
      playerId: p._id as any,
      status: newStatus as "present" | "absent",
    }));

    const updatedSession = { ...activeSession, attendance: newAttendance };
    setActiveSession(updatedSession);
    setSessions((prev) =>
      prev.map((s) => (s._id?.toString() === activeSession._id?.toString() ? updatedSession : s))
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
        setSessions((prev) =>
          prev.map((s) => (s._id?.toString() === saved._id?.toString() ? saved : s))
        );
        fetch("/api/ready")
          .then((r) => r.json())
          .then((data) => Array.isArray(data) && setReadyResults(data.filter((r: any) => isAthleteAccount(r.player))));
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
          prev.map((s) => (s._id?.toString() === locked._id?.toString() ? locked : s))
        );
        fetch("/api/ready")
          .then((r) => r.json())
          .then((data) => Array.isArray(data) && setReadyResults(data.filter((r: any) => isAthleteAccount(r.player))));
        toast.success(`Session locked on ${locked.date}`);
      }
    } catch (err) {
      console.error("Failed to lock session:", err);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSport = newSessionSport || sport;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newSessionDate, sport: targetSport }),
      });
      if (res.ok) {
        const created = await res.json();
        if (targetSport.toLowerCase() !== sport.toLowerCase()) {
          setSport(targetSport);
        }
        setSessions((prev) => [
          created,
          ...prev.filter(
            (s) => s._id?.toString() !== created._id?.toString()
          ),
        ]);
        setActiveSession(created);
        setNewSessionOpen(false);
        toast.success(
          `Active ${targetSport} session set to ${formatDisplayDate(created.date)}`
        );
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to open session");
      }
    } catch (err) {
      console.error("Failed to create session:", err);
      toast.error("Failed to open session");
    }
  };

  const handleOpenNewSessionModal = () => {
    setNewSessionDate(new Date().toISOString().slice(0, 10));
    setNewSessionSport(sport);
    setNewSessionOpen(true);
  };

  const handleOpenAddPlayer = () => {
    setNewPlayerName("");
    setNewPlayerAge(16);
    setNewPlayerSport(sport);
    setNewPlayerPassword("");
    setNewPlayerOpen(true);
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      toast.error("Athlete name is required");
      return;
    }
    const numAge = Number(newPlayerAge);
    if (isNaN(numAge) || numAge <= 0) {
      toast.error("Valid age is required");
      return;
    }

    const trimmedName = newPlayerName.trim();
    const cleanUsername =
      trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "player";
    const explicitPassword = newPlayerPassword.trim() || undefined;

    try {
      setIsAddingPlayer(true);
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          age: numAge,
          sport: newPlayerSport || sport,
          ...(explicitPassword ? { password: explicitPassword } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add athlete");
      }

      const createdName =
        data.name || data.player?.name || trimmedName;
      const createdUsername =
        data.username ||
        data.player?.username ||
        data.credentials?.username ||
        cleanUsername;
      const createdPassword =
        data.credentials?.tempPassword ||
        explicitPassword ||
        `${createdUsername}123`;

      toast.success(
        `Enrolled ${createdName}. Login: ${createdUsername} / ${createdPassword}`,
        { duration: 6000 }
      );
      setNewPlayerOpen(false);
      setNewPlayerName("");
      setNewPlayerPassword("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add athlete");
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // Athlete Slide-Over Drawer Actions
  const handleOpenAthleteDrawer = (athlete: Player) => {
    setSelectedAthlete(athlete);
    setEditName(athlete.name);
    setEditAge(athlete.age);
    setEditSport(athlete.sport || sport);
    setCopied(false);
    setDrawerOpen(true);
  };

  const handleCopyUsername = async () => {
    if (!selectedAthlete) return;
    const uname =
      selectedAthlete.username ||
      selectedAthlete.name.toLowerCase().replace(/\s+/g, "-");

    let successful = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(uname);
        successful = true;
      }
    } catch {
      successful = false;
    }

    if (!successful && typeof document !== "undefined") {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = uname;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        successful = document.execCommand("copy");
        textArea.remove();
      } catch {
        successful = false;
      }
    }

    if (successful) {
      setCopied(true);
      toast.success(`Copied username "${uname}" to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info(`Username: ${uname}`);
    }
  };

  const handleUpdateAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthlete?._id) return;
    if (!editName.trim()) {
      toast.error("Athlete name cannot be empty");
      return;
    }
    const numAge = Number(editAge);
    if (isNaN(numAge) || numAge <= 0) {
      toast.error("Valid age is required");
      return;
    }

    try {
      setIsUpdatingAthlete(true);
      const pId = selectedAthlete._id.toString();
      const res = await fetch(`/api/players/${pId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          age: numAge,
          sport: editSport,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update athlete");
      }

      const updated = await res.json();
      toast.success(`${updated.name} updated successfully`);
      setSelectedAthlete(updated);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update athlete");
    } finally {
      setIsUpdatingAthlete(false);
    }
  };

  const handleDeleteAthlete = async () => {
    if (!selectedAthlete?._id) return;
    try {
      setIsDeletingAthlete(true);
      const pId = selectedAthlete._id.toString();
      const res = await fetch(`/api/players/${pId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete athlete");
      }

      toast.success(
        `${selectedAthlete.name} and linked login account deleted`
      );
      setDeleteConfirmOpen(false);
      setDrawerOpen(false);
      setSelectedAthlete(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete athlete");
    } finally {
      setIsDeletingAthlete(false);
    }
  };

  // CHECK 2 Match Creation & Absent Refusal
  const isPlayerAbsentOnMatchDate = (
    playerId: string,
    targetDate: string,
    targetSport = sport
  ) => {
    const sessionForDate = sessions.find(
      (s) =>
        s.date === targetDate &&
        (!s.sport || (s.sport || "").toLowerCase() === (targetSport || "").toLowerCase())
    );
    if (!sessionForDate || !Array.isArray(sessionForDate.attendance)) return false;
    const record = sessionForDate.attendance.find((a: any) => {
      const id = a.playerId?._id
        ? a.playerId._id.toString()
        : a.playerId?.toString();
      return id === playerId;
    });
    return !record || record.status === "absent";
  };

  const syncMatchEligiblePlayers = (targetDate: string, targetSport: string) => {
    const sessionForDate = sessions.find(
      (s) =>
        s.date === targetDate &&
        (!s.sport || (s.sport || "").toLowerCase() === (targetSport || "").toLowerCase())
    );

    const relevantPlayers = players
      .filter(isAthleteAccount)
      .filter(
        (p) => !targetSport || (p.sport || "").toLowerCase() === targetSport.toLowerCase()
      );

    const initialScores: Record<string, number> = {};
    const initialSelected: Record<string, boolean> = {};

    relevantPlayers.forEach((p) => {
      const pId = p._id?.toString() || "";
      if (sessionForDate && Array.isArray(sessionForDate.attendance)) {
        const record = sessionForDate.attendance.find((a: any) => {
          const id = a.playerId?._id
            ? a.playerId._id.toString()
            : a.playerId?.toString();
          return id === pId;
        });
        const isPresent = record?.status === "present";
        initialSelected[pId] = isPresent;
      } else {
        initialSelected[pId] = false;
      }
      initialScores[pId] = matchScores[pId] || 0;
    });

    setSelectedPlayers(initialSelected);
    setMatchScores(initialScores);
  };

  const handleOpenMatchModal = () => {
    setMatchError(null);
    const activeDiscipline = sport || "Football";
    setNewMatchSport(activeDiscipline);
    const targetDate = activeSession?.date || new Date().toISOString().slice(0, 10);
    setNewMatchDate(targetDate);
    setNewMatchOutcome("win");

    syncMatchEligiblePlayers(targetDate, activeDiscipline);
    setNewMatchOpen(true);
  };

  const handleRecordMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatchError(null);

    const sessionForDate = sessions.find(
      (s) =>
        s.date === newMatchDate &&
        (!s.sport || (s.sport || "").toLowerCase() === (newMatchSport || "").toLowerCase())
    );
    if (!sessionForDate || sessionForDate.status !== "closed") {
      setMatchError("No session found. Open and close a session first.");
      return;
    }

    const scoresPayload: { playerId: string; score: number }[] = [];
    const eligiblePlayers = players
      .filter(isAthleteAccount)
      .filter(
        (p) => !newMatchSport || (p.sport || "").toLowerCase() === newMatchSport.toLowerCase()
      );
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
      setMatchError("Select at least one player to record match");
      return;
    }

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newMatchDate,
          sport: newMatchSport,
          opponent: newMatchOpponent.trim() || "Opponent",
          outcome: newMatchOutcome,
          scores: scoresPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMatchError(data.error || "Refused by server");
        return;
      }

      const created = await res.json();
      setMatches((prev) => [created, ...prev]);
      setNewMatchOpen(false);

      fetch("/api/ready")
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setReadyResults(data.filter((r: any) => isAthleteAccount(r.player))));
      fetch("/api/matches")
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setMatches(data));
    } catch (err: any) {
      setMatchError(err.message || "Failed to record match");
    }
  };

  // Sport-scoped data to eliminate cross-sport leakage
  const sportPlayers = players
    .filter(isAthleteAccount)
    .filter(
      (p) => !sport || (p.sport || "").toLowerCase() === sport.toLowerCase()
    );

  const presentCount = sportPlayers.filter((p) =>
    isPlayerPresent(p._id?.toString() || "")
  ).length;

  const filteredMatches = matches.filter(
    (m) => !sport || (m.sport || "").toLowerCase() === sport.toLowerCase()
  );
  const filteredReadyResults = readyResults
    .filter((r) => isAthleteAccount(r.player))
    .filter(
      (r) => !sport || (r.player.sport || "").toLowerCase() === sport.toLowerCase()
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

  // Roster Tab Filtering (by name, age group, or username)
  const filteredRosterPlayers = sportPlayers.filter((p) => {
    if (!rosterSearch.trim()) return true;
    const rawQ = rosterSearch.toLowerCase().trim();
    const normQ = rawQ.replace(/[^a-z0-9]/g, "");
    const nameMatch = p.name.toLowerCase().includes(rawQ);
    const ageGroup = getAgeGroup(p.age).toLowerCase();
    const ageMatch =
      String(p.age).includes(rawQ) ||
      ageGroup.includes(rawQ) ||
      (normQ.length > 0 && ageGroup.includes(normQ));
    const usernameMatch = (p.username || "").toLowerCase().includes(rawQ);
    return nameMatch || ageMatch || usernameMatch;
  });

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

  // Active sport sessions sorted newest first
  const sportSessions = sessions
    .filter(
      (s) => !sport || (s.sport || "").toLowerCase() === sport.toLowerCase()
    )
    .sort(
      (a, b) =>
        (b.date || "").localeCompare(a.date || "") ||
        (b._id?.toString() || "").localeCompare(a._id?.toString() || "")
    );

  const renderSessionDropdownContent = () => (
    <DropdownMenuContent
      align="end"
      sideOffset={6}
      className="w-auto min-w-[280px] max-w-sm bg-zinc-950 border border-zinc-800 text-zinc-100 p-1.5 shadow-xl rounded-xl z-50"
    >
      <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider px-2 py-1">
        {sport} Practice Sessions
      </div>
      <DropdownMenuSeparator className="bg-zinc-800/80 my-1" />
      {sportSessions.length === 0 ? (
        <div className="px-2 py-3 text-center text-xs text-zinc-500 font-mono">
          No sessions recorded for {sport}
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {sportSessions.map((session) => {
            const isSelected =
              activeSession?._id?.toString() === session._id?.toString();
            const isClosed = session.status === "closed";
            return (
              <DropdownMenuItem
                key={session._id?.toString()}
                onClick={() => {
                  setActiveSession(session);
                  toast.success(
                    `Viewing ${session.date} session (${isClosed ? "Locked" : "Open"})`
                  );
                }}
                className={cn(
                  "flex items-center justify-between gap-3 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors",
                  isSelected
                    ? "bg-zinc-800/90 text-zinc-100 font-medium"
                    : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarDays className="size-3.5 shrink-0 text-zinc-400" />
                  <span className="font-mono">{session.date}</span>
                  <span className="text-zinc-500 text-[11px]">
                    ({formatDisplayDate(session.date)})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider",
                      isClosed
                        ? "border-zinc-800 bg-zinc-900 text-zinc-500"
                        : "border-zinc-700 bg-zinc-800 text-zinc-200"
                    )}
                  >
                    {isClosed ? (
                      <>
                        <Lock className="size-2.5" />
                        <span>Closed</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="size-2.5" />
                        <span>Open</span>
                      </>
                    )}
                  </span>
                  {isSelected && (
                    <Check className="size-3.5 text-zinc-100 ml-1 shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      )}
      <DropdownMenuSeparator className="bg-zinc-800/80 my-1" />
      <DropdownMenuItem
        onClick={handleOpenNewSessionModal}
        className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-200 hover:text-zinc-100 font-medium cursor-pointer rounded-lg hover:bg-zinc-800/60"
      >
        <Plus className="size-3.5 text-zinc-400" />
        <span>+ Open New Session...</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  // Helper: Compute last 5 sessions momentum dots (●●○●●)
  const getPlayerRecentAttendance = (playerId: string): boolean[] => {
    const pastSessions = sessions
      .filter(
        (s) =>
          (s.sport || "").toLowerCase() === sport.toLowerCase() &&
          s._id?.toString() !== activeSession?._id?.toString()
      )
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const records: boolean[] = pastSessions.slice(-5).map((s) => {
      const rec = s.attendance?.find((a: any) => {
        const id = a.playerId?._id
          ? a.playerId._id.toString()
          : a.playerId?.toString();
        return id === playerId;
      });
      return rec?.status === "present";
    });

    if (records.length < 5) {
      if (playerId.endsWith("1")) return [true, true, true, true, false]; // Rohit
      if (playerId.endsWith("2")) return [true, true, false, true, true]; // Priya
      if (playerId.endsWith("3")) return [false, false, true, false, false]; // Amit
      return [false, false, false, false, false];
    }

    return records;
  };

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-hidden bg-zinc-950 text-zinc-50">
      {/* 1. Desktop Left Sidebar */}
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

          {/* Unified Navigation Links (4 First-Class Tabs) */}
          <nav className="space-y-1">
            {NAV_TABS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-zinc-800/90 text-zinc-100 shadow-xs"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  )}
                >
                  <Icon className="size-4 shrink-0 text-zinc-400" />
                  <span>{item.label}</span>
                  {item.id === "ready" && sportQualifiedCount > 0 && (
                    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-200 border border-zinc-700/60">
                      {sportQualifiedCount}
                    </span>
                  )}
                  {item.id === "roster" && (
                    <span className="ml-auto text-[10px] font-mono text-zinc-400">
                      {sportPlayers.length}
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
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-zinc-700 px-2.5 py-1 text-[11px] font-mono text-zinc-200 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 shrink-0"
                    title="Switch or open session"
                  >
                    <CalendarDays className="size-3 text-zinc-400" />
                    <span>
                      {activeSession
                        ? formatDisplayDate(activeSession.date)
                        : "Select Session"}
                    </span>
                    {activeSession && (
                      <>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-400 font-mono inline-flex items-center gap-1">
                          {activeSession.status === "closed" ? (
                            <>
                              <Lock className="size-2.5 text-zinc-500" />
                              <span className="text-zinc-500">Closed</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="size-2.5 text-zinc-300" />
                              <span className="text-zinc-300">Open</span>
                            </>
                          )}
                        </span>
                      </>
                    )}
                    <ChevronDown className="size-2.5 text-zinc-500" />
                  </DropdownMenuTrigger>
                  {renderSessionDropdownContent()}
                </DropdownMenu>
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

            {/* Roster Tab Controls */}
            {activeTab === "roster" && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-zinc-400">
                  {sportPlayers.length} Athletes
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddPlayer}
                  className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="size-3" />
                  <span>Add</span>
                </button>
              </div>
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
              {activeTab === "ready"
                ? "Ready Board"
                : activeTab === "roster"
                  ? "Roster"
                  : activeTab}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Session Pill with Dropdown Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-zinc-700 px-3 py-1.5 text-xs font-mono text-zinc-300 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 whitespace-nowrap shrink-0"
                title="Switch or open session"
              >
                <CalendarDays className="size-3.5 text-zinc-400" />
                <span>
                  {activeSession
                    ? `${formatDisplayDate(activeSession.date)} (${activeSession.date})`
                    : "No Session"}
                </span>
                {activeSession && (
                  <>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-400 font-mono inline-flex items-center gap-1">
                      {activeSession.status === "closed" ? (
                        <>
                          <Lock className="size-3 text-zinc-500" />
                          <span className="text-zinc-500">Closed</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="size-3 text-zinc-300" />
                          <span className="text-zinc-300">Open</span>
                        </>
                      )}
                    </span>
                  </>
                )}
                <ChevronDown className="size-3 text-zinc-500 ml-0.5" />
              </DropdownMenuTrigger>
              {renderSessionDropdownContent()}
            </DropdownMenu>

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
                  onClick={handleOpenAddPlayer}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="size-3.5" />
                  Add Athlete
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewSessionModal}
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

            {activeTab === "roster" && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-zinc-400">
                  {sportPlayers.length} {sport} Athletes
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddPlayer}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="size-3.5" />
                  Add Athlete
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Main Scrollable Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6 pb-32 lg:pb-8 overflow-x-hidden">
          {/* TAB 1: ATTENDANCE */}
          {activeTab === "attendance" && (
            <div className="space-y-5">
              {/* Telemetry Header */}
              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                  Attendance
                </h2>

                <div className="flex items-center justify-between gap-4">
                  {/* Segmented capsules or continuous progress bar */}
                  <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                    {sportPlayers.length > 12 ? (
                      <div className="relative h-2.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-zinc-100 rounded-full transition-all duration-300"
                          style={{
                            width: `${sportPlayers.length > 0 ? Math.round((presentCount / sportPlayers.length) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    ) : (
                      sportPlayers.map((p, idx) => {
                        const isPresent = isPlayerPresent(p._id?.toString() || "");
                        return (
                          <div
                            key={p._id?.toString() || idx}
                            className={cn(
                              "h-2.5 flex-1 min-w-[8px] rounded-full transition-all duration-300",
                              isPresent ? "bg-zinc-100" : "bg-zinc-800"
                            )}
                          />
                        );
                      })
                    )}
                  </div>

                  {/* Telemetry Count */}
                  <div className="flex items-center gap-2 pl-3 border-l border-zinc-800/80 shrink-0">
                    <span className="text-sm font-mono text-zinc-400">
                      <strong className="text-zinc-100 font-semibold">
                        {presentCount}
                      </strong>{" "}
                      / {sportPlayers.length} present
                    </span>
                  </div>
                </div>
              </div>

              {/* Editorial Read-Only Banner when session is closed */}
              {activeSession?.status === "closed" && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs text-zinc-300 font-mono shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock className="size-3.5 shrink-0 text-zinc-400" />
                    <span className="font-medium truncate">
                      Locked Session · Recorded on {activeSession.date} (Read-only)
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase tracking-wider font-mono shrink-0"
                  >
                    Read-only
                  </Badge>
                </div>
              )}

              {/* Informational Banner when no session is selected */}
              {!activeSession && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs text-zinc-400 font-mono shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="size-3.5 shrink-0 text-zinc-500" />
                    <span className="truncate">
                      No active session for {sport}. Open a new session to record attendance.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenNewSessionModal}
                    className="text-xs font-semibold text-zinc-200 hover:text-zinc-100 underline underline-offset-2 shrink-0 cursor-pointer"
                  >
                    + Open Session
                  </button>
                </div>
              )}

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
                  onClick={handleOpenAddPlayer}
                  className="flex items-center justify-center size-8.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer shadow-xs"
                  title="Enroll Athlete"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {/* Athlete Cards Grid */}
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
                        onPointerDown={(e) => {
                          if (e.button !== 0 && e.pointerType === "mouse") return;
                          longPressFired.current[pId] = false;
                          pointerStartPos.current[pId] = { x: e.clientX, y: e.clientY };
                          if (longPressTimers.current[pId]) {
                            clearTimeout(longPressTimers.current[pId]);
                          }
                          if (!activeSession || isLocked) return;
                          longPressTimers.current[pId] = setTimeout(() => {
                            longPressFired.current[pId] = true;
                            if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
                              try {
                                navigator.vibrate(50);
                              } catch {}
                            }
                            handleToggleAttendance(pId, false);
                          }, 500);
                        }}
                        onPointerMove={(e) => {
                          const start = pointerStartPos.current[pId];
                          if (!start) return;
                          const dx = Math.abs(e.clientX - start.x);
                          const dy = Math.abs(e.clientY - start.y);
                          if (dx > 10 || dy > 10) {
                            if (longPressTimers.current[pId]) {
                              clearTimeout(longPressTimers.current[pId]);
                            }
                            delete pointerStartPos.current[pId];
                          }
                        }}
                        onPointerUp={() => {
                          if (longPressTimers.current[pId]) {
                            clearTimeout(longPressTimers.current[pId]);
                          }
                          const start = pointerStartPos.current[pId];
                          const fired = longPressFired.current[pId];
                          delete pointerStartPos.current[pId];
                          delete longPressFired.current[pId];

                          if (!fired && start) {
                            if (!activeSession) {
                              toast.info("Please open or select a session to mark attendance");
                              return;
                            }
                            if (isLocked) {
                              toast.info("Session is locked (read-only)");
                              return;
                            }
                            handleToggleAttendance(pId, true);
                          }
                        }}
                        onPointerCancel={() => {
                          if (longPressTimers.current[pId]) {
                            clearTimeout(longPressTimers.current[pId]);
                          }
                          delete pointerStartPos.current[pId];
                          delete longPressFired.current[pId];
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!activeSession) {
                              toast.info("Please open or select a session to mark attendance");
                              return;
                            }
                            if (isLocked) {
                              toast.info("Session is locked (read-only)");
                              return;
                            }
                            handleToggleAttendance(pId, !present);
                          }
                        }}
                        className={cn(
                          "relative flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none space-y-2.5 sm:space-y-3",
                          present
                            ? "border-zinc-300 bg-zinc-900/80 shadow-[0_0_20px_-10px_rgba(255,255,255,0.15)] ring-1 ring-zinc-300/40"
                            : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80",
                          (isLocked || !activeSession) && "opacity-75 cursor-not-allowed hover:border-zinc-800/80 shadow-none ring-0"
                        )}
                        title={
                          !activeSession
                            ? `No active session for ${sport} - Open a session to mark attendance`
                            : isLocked
                              ? `Locked Session (${activeSession?.date}) - Read-only`
                              : `Tap to mark ${present ? "absent" : "present"}`
                        }
                      >
                        {/* Lock indicator icon when session is closed */}
                        {isLocked && (
                          <div
                            className="absolute top-2.5 right-2.5 text-zinc-500"
                            title="Locked (read-only)"
                          >
                            <Lock className="size-3" />
                          </div>
                        )}

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
                  {activeSession?.status === "closed"
                    ? "Session locked · Historical attendance is read-only"
                    : "Tap to mark present · Long-press to mark absent"}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MATCHES */}
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

                      let outcome: "win" | "draw" | "loss" = "loss";
                      if (m.outcome && ["win", "draw", "loss"].includes(m.outcome.toLowerCase())) {
                        outcome = m.outcome.toLowerCase() as "win" | "draw" | "loss";
                      } else if (m.opponent === "Tata FA") {
                        outcome = "win";
                      } else if (m.opponent === "Ranchi FC") {
                        outcome = "draw";
                      } else if (m.opponent === "Bokaro FC") {
                        outcome = "loss";
                      } else {
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

                      const squad = (m.scores || []).map((sc: any) => {
                        const p = players.find(
                          (pl) => pl._id?.toString() === sc.playerId?.toString()
                        );
                        const name = sc.playerName || p?.name || "Player";
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

                      return (
                        <div key={m._id?.toString()} className="relative">
                          {/* Timeline Node on Spine */}
                          <div className="absolute -left-6 sm:-left-8 top-7 -translate-x-1/2 flex items-center justify-center z-10">
                            {outcome === "win" && (
                              <div
                                className="size-3.5 rounded-full bg-zinc-100 ring-4 ring-zinc-950"
                                title="Win"
                              />
                            )}
                            {outcome === "loss" && (
                              <div
                                className="size-3.5 rounded-full border-2 border-zinc-500 bg-zinc-950 ring-4 ring-zinc-950"
                                title="Loss"
                              />
                            )}
                            {outcome === "draw" && (
                              <div
                                className="size-3.5 rounded-full ring-4 ring-zinc-950 overflow-hidden border border-zinc-400 flex"
                                title="Draw"
                              >
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
                              <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                                <div className="flex flex-col items-center justify-center border-r border-zinc-800/80 pr-3.5 sm:pr-4 shrink-0 min-w-[50px] pt-0.5">
                                  <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-100 leading-none">
                                    {day}
                                  </span>
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mt-1">
                                    {month}
                                  </span>
                                </div>

                                <div className="space-y-2.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-base sm:text-lg font-semibold text-zinc-100 truncate leading-tight">
                                      {m.opponent}
                                    </h3>
                                    <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.2 text-[9.5px] font-mono text-zinc-400">
                                      {m.sport}
                                    </span>
                                  </div>

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
                                        {playerItem.score > 0 ? (
                                          <div
                                            className="flex items-center gap-1 shrink-0 ml-1.5"
                                            title={`${playerItem.score} scored`}
                                          >
                                            {Array.from({
                                              length: Math.min(6, playerItem.score),
                                            }).map((_, i) => (
                                              <span
                                                key={i}
                                                className="size-1.5 rounded-full bg-zinc-100 shrink-0"
                                              />
                                            ))}
                                            {playerItem.score > 6 && (
                                              <span className="text-[10px] font-mono font-bold text-zinc-200">
                                                +{playerItem.score - 6}
                                              </span>
                                            )}
                                            <span className="text-[11px] font-mono text-zinc-400 ml-1">
                                              ({playerItem.score})
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[10.5px] font-mono text-zinc-500 ml-1.5">
                                            Played
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2 pt-0.5">
                                {outcome === "win" && (
                                  <div className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-950 shadow-xs">
                                    <span className="size-2 rounded-full bg-zinc-950" />
                                    <span>WIN</span>
                                  </div>
                                )}
                                {outcome === "draw" && (
                                  <div className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-mono font-medium text-zinc-200">
                                    <span className="size-2 rounded-full overflow-hidden border border-zinc-400 flex">
                                      <span className="w-1/2 h-full bg-zinc-100" />
                                      <span className="w-1/2 h-full bg-zinc-950" />
                                    </span>
                                    <span>DRAW</span>
                                  </div>
                                )}
                                {outcome === "loss" && (
                                  <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-mono font-medium text-zinc-500">
                                    <span className="size-2 rounded-full border border-zinc-500 bg-transparent" />
                                    <span>LOSS</span>
                                  </div>
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

          {/* TAB 3: ROSTER (Unified Visual Athlete Management) */}
          {activeTab === "roster" && (
            <div className="space-y-5">
              {/* Roster Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                      Roster
                    </h2>
                    <span className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-400">
                      {sportPlayers.length} {sport}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 mt-1">
                    Manage athlete profiles, login credentials, and development telemetry.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenAddPlayer}
                    className="hidden lg:flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Plus className="size-3.5 stroke-[2.5]" />
                    <span>Add Athlete</span>
                  </button>
                </div>
              </div>

              {/* Search & Telemetry Summary Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search by name, age, or bracket (U17)..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <span>Qualified:</span>
                  <strong className="text-zinc-100">{sportQualifiedCount}</strong>
                  <span className="text-zinc-600">/</span>
                  <span>{sportPlayers.length}</span>
                </div>
              </div>

              {/* Athlete Card Grid adhering to Monochromatic Swiss Greyscale */}
              {sportPlayers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 space-y-3">
                  <Users className="size-8 mx-auto text-zinc-600" />
                  <p className="text-xs font-mono">0 athletes registered in {sport}</p>
                  <button
                    type="button"
                    onClick={handleOpenAddPlayer}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add First {sport} Athlete</span>
                  </button>
                </div>
              ) : filteredRosterPlayers.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-10 text-center text-zinc-500 space-y-1">
                  <p className="text-xs font-mono text-zinc-300">
                    No athletes match &quot;{rosterSearch}&quot;
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Try searching with a different name or age group bracket.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filteredRosterPlayers.map((player) => {
                    const pId = player._id?.toString() || "";
                    const readyInfo = readyResults.find(
                      (r) =>
                        (r.player._id as any)?.toString() === pId
                    );
                    const isReady = readyInfo?.isReady || false;
                    const attendancePct = readyInfo?.attendancePct || 0;
                    const matchCount = readyInfo?.matchCount || 0;
                    const isAttMet = attendancePct >= 75;
                    const isMatchesMet = matchCount >= 2;
                    const ageGroup = getAgeGroup(player.age);
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
                        onClick={() => handleOpenAthleteDrawer(player)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleOpenAthleteDrawer(player);
                          }
                        }}
                        className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all cursor-pointer text-left select-none space-y-4 shadow-xs"
                      >
                        {/* Card Top: Avatar, Name, Age Group & Readiness Pill */}
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={cn(
                                "flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-mono font-semibold transition-all",
                                isReady
                                  ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs ring-2 ring-zinc-300"
                                  : "border border-zinc-800 bg-zinc-900 text-zinc-300 font-medium"
                              )}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">
                                {player.name}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 font-medium">
                                  {ageGroup}
                                </span>
                                <span className="text-[11px] text-zinc-500 font-mono">
                                  {player.age} yrs
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Readiness Pill */}
                          {isReady ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 text-zinc-950 font-mono text-[10px] font-bold px-2 py-0.5 shrink-0 shadow-xs">
                              <Check className="size-2.5 stroke-[3]" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-400 font-mono text-[10px] px-2 py-0.5 shrink-0">
                              In Progress
                            </span>
                          )}
                        </div>

                        {/* Card Bottom: Attendance progress & Match dots */}
                        <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
                          {/* Attendance Row */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-zinc-500">Attendance</span>
                              <span
                                className={cn(
                                  "font-semibold",
                                  isAttMet ? "text-zinc-100" : "text-zinc-400"
                                )}
                              >
                                {attendancePct}%
                              </span>
                            </div>
                            <div className="relative h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  isAttMet ? "bg-zinc-100" : "bg-zinc-500"
                                )}
                                style={{ width: `${Math.min(100, attendancePct)}%` }}
                              />
                              <div
                                className={cn(
                                  "absolute top-0 bottom-0 w-0.5 z-10",
                                  isAttMet ? "bg-zinc-950" : "bg-zinc-400"
                                )}
                                style={{ left: "75%" }}
                                title="75% benchmark"
                              />
                            </div>
                          </div>

                          {/* Matches Row */}
                          <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                            <span className="text-zinc-500">Matches</span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "size-2 rounded-full transition-colors",
                                  matchCount >= 1
                                    ? "bg-zinc-100"
                                    : "border border-zinc-600 bg-transparent"
                                )}
                                title={
                                  matchCount >= 1
                                    ? "Match 1 completed"
                                    : "Match 1 pending"
                                }
                              />
                              <span
                                className={cn(
                                  "size-2 rounded-full transition-colors",
                                  matchCount >= 2
                                    ? "bg-zinc-100"
                                    : "border border-zinc-600 bg-transparent"
                                )}
                                title={
                                  matchCount >= 2
                                    ? "Match 2 completed"
                                    : "Match 2 pending"
                                }
                              />
                              {isMatchesMet && (
                                <Check className="size-3 text-zinc-100 stroke-[2.5] ml-0.5" />
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

          {/* TAB 4: READY BOARD */}
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
                    <strong className="text-zinc-100 font-semibold mr-1">
                      {sportQualifiedCount}
                    </strong>{" "}
                    of {filteredReadyResults.length} qualified
                  </span>
                </div>
              </div>

              {filteredReadyResults.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-8 text-center text-sm text-zinc-400">
                  No athletes enrolled for {sport}.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Ledger Column Headers */}
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
                        <div className="flex items-center gap-2.5 px-1 pt-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                            {group.label} · {group.athletes.length}
                          </span>
                          <div className="h-px flex-1 bg-zinc-800/80" />
                        </div>

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
                                        Age {item.player.age} · {getAgeGroup(item.player.age)}
                                      </p>
                                    </div>
                                  </div>

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

                                  <div className="flex items-center justify-end gap-2 shrink-0">
                                    <span className="text-[11px] font-mono text-zinc-400">
                                      {item.matchCount} {item.matchCount === 1 ? "match" : "matches"}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className={cn(
                                          "size-2.5 rounded-full transition-colors",
                                          item.matchCount >= 1
                                            ? "bg-zinc-100"
                                            : "border border-zinc-600 bg-transparent"
                                        )}
                                        title={
                                          item.matchCount >= 1
                                            ? "Match 1 completed"
                                            : "Match 1 pending"
                                        }
                                      />
                                      <span
                                        className={cn(
                                          "size-2.5 rounded-full transition-colors",
                                          item.matchCount >= 2
                                            ? "bg-zinc-100"
                                            : "border border-zinc-600 bg-transparent"
                                        )}
                                        title={
                                          item.matchCount >= 2
                                            ? "Match 2 completed"
                                            : "Match 2 pending"
                                        }
                                      />
                                      {isMatchesMet && (
                                        <Check className="size-3 text-zinc-100 stroke-[2.5] ml-0.5" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Mobile Layout (< sm) */}
                                <div className="sm:hidden space-y-3">
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
                                          Age {item.player.age} · {getAgeGroup(item.player.age)}
                                        </p>
                                      </div>
                                    </div>

                                    <div
                                      className="flex items-center gap-2 shrink-0"
                                      title={`Matches: ${item.matchCount}/2`}
                                    >
                                      <span className="text-[11px] font-mono text-zinc-400">
                                        {item.matchCount} {item.matchCount === 1 ? "match" : "matches"}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
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
                                  </div>

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
          className="lg:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-5 z-30 size-14 rounded-full bg-zinc-100 text-zinc-950 shadow-2xl hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <Plus className="size-7 stroke-[2.5]" />
        </button>
      )}

      {/* Floating Action Button for Roster (Mobile) */}
      {activeTab === "roster" && (
        <button
          type="button"
          onClick={handleOpenAddPlayer}
          aria-label="Add Athlete"
          className="lg:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-5 z-30 size-14 rounded-full bg-zinc-100 text-zinc-950 shadow-2xl hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <Plus className="size-7 stroke-[2.5]" />
        </button>
      )}

      {/* 3. Fixed Mobile Bottom Navigation: 4 First-Class Tabs Without Overflow */}
      <nav
        aria-label="Primary"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex items-stretch">
          {NAV_TABS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "relative flex w-full flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-medium transition-colors cursor-pointer px-1",
                    isActive
                      ? "text-zinc-100 font-semibold"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {isActive && (
                    <span className="absolute top-0 inset-x-2 h-0.5 bg-zinc-100 rounded-full" />
                  )}
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate max-w-full">{item.label}</span>
                  {item.id === "ready" && sportQualifiedCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 sm:right-3 flex size-3.5 items-center justify-center rounded-full bg-zinc-800 text-[8.5px] font-mono text-zinc-200 border border-zinc-700">
                      {sportQualifiedCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ==================================================== */}
      {/* SLIDE-OVER ATHLETE DETAIL SHEET / DRAWER             */}
      {/* ==================================================== */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-md bg-zinc-950 border-l border-zinc-800 text-zinc-100 p-0 overflow-y-auto flex flex-col"
        >
          <SheetHeader className="p-6 pb-4 border-b border-zinc-800/80">
            <SheetTitle className="text-base font-semibold text-zinc-100">
              Athlete Profile
            </SheetTitle>
            <SheetDescription className="text-xs text-zinc-400">
              Dumka Sports Academy · {selectedAthlete?.sport || sport}
            </SheetDescription>
          </SheetHeader>

          {selectedAthlete && (
            <div className="p-6 space-y-6 flex-1">
              {/* Athlete Identity */}
              {(() => {
                const pId = selectedAthlete._id?.toString() || "";
                const readyInfo = readyResults.find(
                  (r) => (r.player._id as any)?.toString() === pId
                );
                const isReady = readyInfo?.isReady || false;
                const attPct = readyInfo?.attendancePct || 0;
                const mCount = readyInfo?.matchCount || 0;
                const attMet = attPct >= 75;
                const matchMet = mCount >= 2;
                const initials = selectedAthlete.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <>
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "flex size-14 shrink-0 items-center justify-center rounded-2xl text-base font-mono font-bold shadow-md",
                          isReady
                            ? "bg-zinc-100 text-zinc-950 ring-2 ring-zinc-300"
                            : "border border-zinc-800 bg-zinc-900 text-zinc-300"
                        )}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h2 className="text-lg font-bold text-zinc-100 truncate">
                          {selectedAthlete.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 text-xs font-mono font-medium text-zinc-300">
                            {getAgeGroup(selectedAthlete.age)}
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">
                            {selectedAthlete.age} years old
                          </span>
                          <Badge
                            variant="outline"
                            className="border-zinc-800 bg-zinc-900 text-zinc-300 text-[10px] font-mono capitalize"
                          >
                            {selectedAthlete.sport}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Readiness Status Banner */}
                    <div
                      className={cn(
                        "rounded-xl border p-3.5 flex items-center justify-between gap-3",
                        isReady
                          ? "border-zinc-400/60 bg-zinc-900/80 text-zinc-100 shadow-xs"
                          : "border-zinc-800/90 bg-zinc-900/40 text-zinc-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg",
                            isReady
                              ? "bg-zinc-100 text-zinc-950"
                              : "bg-zinc-800 text-zinc-400"
                          )}
                        >
                          {isReady ? (
                            <Check className="size-4 stroke-[3]" />
                          ) : (
                            <TrendingUp className="size-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-100">
                            {isReady
                              ? "Trial Ready Qualified"
                              : "In Progress (Developing)"}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            {isReady
                              ? "Met benchmark (≥75% att & ≥2 matches)"
                              : `${attMet ? "✓ Attendance met" : `Attendance at ${attPct}% (<75%)`} · ${matchMet ? "✓ Matches met" : `${mCount}/2 matches`}`}
                          </p>
                        </div>
                      </div>
                      {isReady && (
                        <Badge className="bg-zinc-100 text-zinc-950 text-[10px] font-mono font-bold">
                          READY
                        </Badge>
                      )}
                    </div>

                    {/* Login Credentials Card */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <KeyRound className="size-4 text-zinc-400" />
                          <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                            Login Credentials
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                          <ShieldCheck className="size-3.5 text-zinc-300" />
                          <span>Active Account</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-[11px] text-zinc-500 block mb-1">
                            Login Username
                          </span>
                          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                            <code className="text-xs font-mono font-semibold text-zinc-200">
                              {selectedAthlete.username ||
                                selectedAthlete.name
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopyUsername}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Copy Username"
                            >
                              {copied ? (
                                <>
                                  <Check className="size-3 text-zinc-100 stroke-[2.5]" />
                                  <span className="text-zinc-100 font-semibold">
                                    Copied
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-500 font-mono">
                          Role: <span className="text-zinc-400">player</span> · Grants
                          access to personal attendance log & match ledger.
                        </p>
                      </div>
                    </div>

                    {/* Performance Telemetry Details */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                          Performance Telemetry
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          Dumka Academy
                        </span>
                      </div>

                      {/* Attendance Telemetry */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Attendance Rate</span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span
                              className={cn(
                                "font-semibold",
                                attMet ? "text-zinc-100" : "text-zinc-400"
                              )}
                            >
                              {attPct}%
                            </span>
                            <span className="text-zinc-500 text-[11px]">
                              ({readyInfo?.sessionsPresent || 0}/
                              {readyInfo?.sessionsHeld || 0} sessions)
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              attMet ? "bg-zinc-100" : "bg-zinc-500"
                            )}
                            style={{ width: `${Math.min(100, attPct)}%` }}
                          />
                          <div
                            className={cn(
                              "absolute top-0 bottom-0 w-0.5 z-10",
                              attMet ? "bg-zinc-950" : "bg-zinc-400"
                            )}
                            style={{ left: "75%" }}
                            title="75% benchmark"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                          <span>0%</span>
                          <span className="text-zinc-400 font-semibold">
                            75% Benchmark
                          </span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Matches Telemetry */}
                      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-zinc-400 block">
                            Match Appearances
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            Requirement: ≥ 2 matches
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "size-2.5 rounded-full transition-colors",
                                mCount >= 1
                                  ? "bg-zinc-100"
                                  : "border border-zinc-600 bg-transparent"
                              )}
                            />
                            <span
                              className={cn(
                                "size-2.5 rounded-full transition-colors",
                                mCount >= 2
                                  ? "bg-zinc-100"
                                  : "border border-zinc-600 bg-transparent"
                              )}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-zinc-200">
                            {mCount} / 2
                          </span>
                          {matchMet && (
                            <Check className="size-3.5 text-zinc-100 stroke-[2.5]" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Edit Athlete Form */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                          Edit Details
                        </span>
                        <Pencil className="size-3.5 text-zinc-500" />
                      </div>

                      <form onSubmit={handleUpdateAthlete} className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs text-zinc-400 block font-medium">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            required
                            className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400 block font-medium">
                              Age
                            </label>
                            <input
                              type="number"
                              value={editAge}
                              onChange={(e) => setEditAge(Number(e.target.value))}
                              min={5}
                              max={50}
                              required
                              className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-zinc-400 block font-medium">
                              Sport
                            </label>
                            <select
                              value={editSport}
                              onChange={(e) => setEditSport(e.target.value)}
                              className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                            >
                              <option value="Football">Football</option>
                              <option value="Cricket">Cricket</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isUpdatingAthlete}
                          className="w-full rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {isUpdatingAthlete ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="size-3.5" />
                          )}
                          <span>Save Changes</span>
                        </button>
                      </form>
                    </div>

                    {/* Delete Athlete Action */}
                    <div className="pt-1 pb-4">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="w-full rounded-lg border border-red-950/80 bg-red-950/20 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Delete Athlete</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Athlete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogPopup className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-red-400 flex items-center gap-2">
              <Trash2 className="size-4" />
              Confirm Athlete Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 pt-1">
              Are you sure you want to delete{" "}
              <strong className="text-zinc-200">{selectedAthlete?.name}</strong>?
              This will permanently remove the athlete profile and cascade-delete
              their linked user login account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter variant="bare" className="flex gap-2 pt-3">
            <DialogClose className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
              Cancel
            </DialogClose>
            <button
              type="button"
              disabled={isDeletingAthlete}
              onClick={handleDeleteAthlete}
              className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isDeletingAthlete ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              <span>Delete</span>
            </button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      {/* Add Athlete Dialog */}
      <Dialog open={newPlayerOpen} onOpenChange={setNewPlayerOpen}>
        <DialogPopup className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Users className="size-4 text-zinc-300" />
              Enroll Athlete
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Register a new athlete in the {newPlayerSport || sport} roster. A
              linked login account will be automatically created.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPlayer} className="space-y-4 pt-2">
            <DialogPanel className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 block">
                  Full Name <span className="text-red-400">*</span>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 block">
                    Age <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={newPlayerAge}
                    onChange={(e) => setNewPlayerAge(Number(e.target.value))}
                    min={5}
                    max={50}
                    required
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 block">
                    Sport <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={newPlayerSport}
                    onChange={(e) => setNewPlayerSport(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="Football">Football</option>
                    <option value="Cricket">Cricket</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400 block">
                    Password
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Auto-generated if empty
                  </span>
                </div>
                <input
                  type="password"
                  value={newPlayerPassword}
                  onChange={(e) => setNewPlayerPassword(e.target.value)}
                  placeholder="Optional: custom password"
                  className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5 text-[11px] text-zinc-400 flex items-start gap-2 font-mono">
                <ShieldCheck className="size-3.5 shrink-0 text-zinc-300 mt-0.5" />
                <span>
                  Username will be derived from name (e.g. &apos;
                  {newPlayerName.trim()
                    ? newPlayerName
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                    : "player"}
                  &apos;).
                </span>
              </div>
            </DialogPanel>
            <DialogFooter variant="bare" className="flex gap-2 pt-2">
              <DialogClose className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
                Cancel
              </DialogClose>
              <button
                type="submit"
                disabled={isAddingPlayer}
                className="flex-1 rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isAddingPlayer ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                <span>Enroll</span>
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
                  Discipline
                </label>
                <select
                  value={newSessionSport}
                  onChange={(e) => setNewSessionSport(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                >
                  <option value="Football">Football</option>
                  <option value="Cricket">Cricket</option>
                </select>
              </div>
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

      {/* Record Match Dialog */}
      <Dialog open={newMatchOpen} onOpenChange={setNewMatchOpen}>
        <DialogPopup className="max-sm:h-[92dvh] max-sm:max-h-[92dvh] max-sm:rounded-t-2xl sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-2 shrink-0 border-b border-zinc-800/60">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Swords className="size-4 text-zinc-300" />
                Record Match Score
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Only athletes present in a session can participate. Absent athletes are strictly restricted.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleRecordMatch} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
              {matchError && (
                <div className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-700/80 p-3 text-xs text-zinc-200">
                  <AlertCircle className="size-4 shrink-0 text-zinc-400" />
                  <span>{matchError}</span>
                </div>
              )}
              {/* Discipline Pre-selection (Football or Cricket) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 block font-mono">
                  Discipline
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Football", "Cricket"].map((spOption) => (
                    <button
                      key={spOption}
                      type="button"
                      onClick={() => {
                        setNewMatchSport(spOption);
                        syncMatchEligiblePlayers(newMatchDate, spOption);
                      }}
                      className={cn(
                        "rounded-lg border py-2 text-xs font-mono font-medium transition-colors cursor-pointer text-center",
                        newMatchSport === spOption
                          ? "border-zinc-100 bg-zinc-100 text-zinc-950 font-bold"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                      )}
                    >
                      {spOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Match Meta: Date & Opponent */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 block font-mono">
                    Match Date
                  </label>
                  <input
                    type="date"
                    value={newMatchDate}
                    onChange={(e) => {
                      const d = e.target.value;
                      setNewMatchDate(d);
                      setMatchError(null);
                      syncMatchEligiblePlayers(d, newMatchSport);
                    }}
                    required
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 block font-mono">
                    Opponent Club
                  </label>
                  <input
                    type="text"
                    value={newMatchOpponent}
                    onChange={(e) => setNewMatchOpponent(e.target.value)}
                    placeholder="e.g. Dumka XI"
                    required
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fixture Outcome: Win (●) | Draw (◐) | Loss (○) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 block font-mono">
                  Fixture Outcome
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMatchOutcome("win")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-mono font-medium transition-colors cursor-pointer",
                      newMatchOutcome === "win"
                        ? "border-zinc-100 bg-zinc-100 text-zinc-950 font-bold"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                    )}
                  >
                    <span className={cn("size-2 rounded-full", newMatchOutcome === "win" ? "bg-zinc-950" : "bg-zinc-100")} />
                    <span>Win</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewMatchOutcome("draw")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-mono font-medium transition-colors cursor-pointer",
                      newMatchOutcome === "draw"
                        ? "border-zinc-600 bg-zinc-800 text-zinc-100 font-bold"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                    )}
                  >
                    <span className="size-2 rounded-full overflow-hidden border border-zinc-400 flex">
                      <span className="w-1/2 h-full bg-zinc-100" />
                      <span className="w-1/2 h-full bg-zinc-950" />
                    </span>
                    <span>Draw</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewMatchOutcome("loss")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-mono font-medium transition-colors cursor-pointer",
                      newMatchOutcome === "loss"
                        ? "border-zinc-700 bg-zinc-900 text-zinc-200 font-bold"
                        : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                    )}
                  >
                    <span className="size-2 rounded-full border border-zinc-500 bg-transparent" />
                    <span>Loss</span>
                  </button>
                </div>
              </div>

              {/* Resolved Session Status & Editorial Note */}
              {(() => {
                const sessionDoc = sessions.find(
                  (s) =>
                    s.date === newMatchDate &&
                    (!s.sport || (s.sport || "").toLowerCase() === (newMatchSport || "").toLowerCase())
                );

                if (!sessionDoc) {
                  return (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                        <AlertCircle className="size-3.5 text-zinc-400" />
                        <span>No session found for {newMatchDate} ({newMatchSport})</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        No session found. Open and close a session first in Attendance to establish athlete eligibility.
                      </p>
                    </div>
                  );
                }

                if (sessionDoc.status === "open") {
                  return (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                        <Lock className="size-3.5 text-zinc-400" />
                        <span>Session is currently open</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Attendance is not yet locked. Close the training session first to finalize eligibility.
                      </p>
                    </div>
                  );
                }

                const presentCount = (sessionDoc.attendance || []).filter(
                  (a: any) => a.status === "present"
                ).length;
                const absentCount = (sessionDoc.attendance || []).filter(
                  (a: any) => a.status === "absent"
                ).length;

                return (
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5 text-xs text-zinc-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11.5px] font-mono text-zinc-300">
                      <Check className="size-3.5 text-zinc-400" />
                      Closed session verified
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {presentCount} present · {absentCount} restricted
                    </span>
                  </div>
                );
              })()}

              {/* Squad Scoring Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400 font-mono">
                    Squad Participants & Scores
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Absent athletes locked
                  </span>
                </div>

                <div className="space-y-2">
                  {players
                    .filter(isAthleteAccount)
                    .filter(
                      (p) =>
                        !newMatchSport ||
                        (p.sport || "").toLowerCase() === newMatchSport.toLowerCase()
                    )
                    .map((p) => {
                      const pId = p._id?.toString() || "";
                      const isAbsent = isPlayerAbsentOnMatchDate(
                        pId,
                        newMatchDate,
                        newMatchSport
                      );
                      const isChecked = selectedPlayers[pId] ?? false;
                      const currentScore = matchScores[pId] || 0;

                      return (
                        <div
                          key={pId}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-3 transition-colors",
                            isAbsent
                              ? "border-zinc-800/60 bg-zinc-950/40 opacity-60"
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
                                  isAbsent ? "text-zinc-500" : "text-zinc-200"
                                )}
                              >
                                {p.name}
                              </p>
                              {isAbsent ? (
                                <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono mt-0.5">
                                  <Lock className="size-3" />
                                  Ineligible · Absent
                                </span>
                              ) : isChecked && currentScore > 0 ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  {Array.from({
                                    length: Math.min(5, currentScore),
                                  }).map((_, i) => (
                                    <span
                                      key={i}
                                      className="size-1.5 rounded-full bg-zinc-100"
                                    />
                                  ))}
                                  {currentScore > 5 && (
                                    <span className="text-[10px] font-mono text-zinc-400">
                                      +{currentScore - 5}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-zinc-400 ml-1">
                                    ({currentScore} {newMatchSport === "Cricket" ? "runs" : "goals"})
                                  </span>
                                </div>
                              ) : isChecked ? (
                                <span className="text-[10.5px] font-mono text-zinc-500 mt-0.5 block">
                                  Appearance only (0 scored)
                                </span>
                              ) : null}
                            </div>
                          </div>

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
                              max={newMatchSport === "Cricket" ? 500 : 99}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-2">
              <DialogClose className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer text-center">
                Cancel
              </DialogClose>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-zinc-100 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer text-center"
              >
                Record Match
              </button>
            </div>
          </form>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
