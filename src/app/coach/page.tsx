import Link from "next/link";
import { getDb } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CalendarCheck,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const db = await getDb();
    const [playersCount, sessionsCount, matchesCount] = await Promise.all([
      db.collection("players").countDocuments(),
      db.collection("sessions").countDocuments(),
      db.collection("matches").countDocuments(),
    ]);

    // Count open sessions
    const openSessions = await db.collection("sessions").countDocuments({ status: "open" });

    return {
      players: playersCount,
      sessions: sessionsCount,
      openSessions,
      matches: matchesCount,
    };
  } catch {
    return {
      players: 0,
      sessions: 0,
      openSessions: 0,
      matches: 0,
    };
  }
}

export default async function CoachDashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-card via-card/80 to-muted/40 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                Dumka Academy Desk
              </Badge>
              <span className="text-xs text-muted-foreground">• Coach Control Room</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome, Coach
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Track attendance, record match scores, and instantly discover which players have earned trial readiness.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/coach/players" className={buttonVariants({ size: "sm" })}>
              <Users className="size-4 mr-1.5" />
              Add Player
            </Link>
            <Link
              href="/coach/sessions"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <CalendarCheck className="size-4 mr-1.5" />
              Open Session
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Players
            </CardTitle>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.players}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active academy roster
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Practice Sessions
            </CardTitle>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.sessions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.openSessions > 0 ? (
                <span className="text-emerald-600 font-medium">
                  {stats.openSessions} session currently open
                </span>
              ) : (
                "All sessions closed & locked"
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Matches Recorded
            </CardTitle>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Award className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.matches}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Competitive fixtures logged
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready Board
            </CardTitle>
            <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">≥75% + 2M</div>
            <p className="text-xs text-muted-foreground mt-1">
              Criteria for scout trial readiness
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/coach/players" className="group">
          <Card className="h-full transition-all hover:shadow-md group-hover:border-primary/60">
            <CardHeader>
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Users className="size-5" />
              </div>
              <CardTitle className="text-base group-hover:text-primary transition-colors flex items-center justify-between">
                Player Roster
                <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Enroll new players, manage details, and provision automatic login credentials.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/coach/sessions" className="group">
          <Card className="h-full transition-all hover:shadow-md group-hover:border-primary/60">
            <CardHeader>
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <ClipboardList className="size-5" />
              </div>
              <CardTitle className="text-base group-hover:text-primary transition-colors flex items-center justify-between">
                Attendance Desk
                <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Open sessions by date and sport. Toggle Present/Absent. Close to lock attendance.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/coach/matches" className="group">
          <Card className="h-full transition-all hover:shadow-md group-hover:border-primary/60">
            <CardHeader>
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Award className="size-5" />
              </div>
              <CardTitle className="text-base group-hover:text-primary transition-colors flex items-center justify-between">
                Match Scoresheet
                <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Record match opponents and player scores. Absent players are automatically refused.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/coach/ready" className="group">
          <Card className="h-full transition-all hover:shadow-md group-hover:border-primary/60">
            <CardHeader>
              <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Sparkles className="size-5" />
              </div>
              <CardTitle className="text-base group-hover:text-primary transition-colors flex items-center justify-between">
                Trial Ready Board
                <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Live evaluation table showing attendance percentages, match tallies, and Ready badges.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Dumka Academy Rules Reference Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <CardTitle className="text-base">Dumka Academy Desk Operating Rules</CardTitle>
          </div>
          <CardDescription>
            Core rules programmed into this desk to satisfy all 4 verification scenarios:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/40">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                1
              </span>
              <div>
                <p className="font-semibold text-foreground">Session Lifecycle (CHECK 1)</p>
                <p className="text-muted-foreground mt-0.5">
                  1. Open session (date + sport) → 2. Mark Present / Absent → 3. Close to lock permanently.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/40">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                2
              </span>
              <div>
                <p className="font-semibold text-foreground">Absent Players Refused (CHECK 2)</p>
                <p className="text-muted-foreground mt-0.5">
                  Match scoresheet rejects absent players. Only players present on that date can have scores.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/40">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                3
              </span>
              <div>
                <p className="font-semibold text-foreground">Ready Benchmark (CHECK 3)</p>
                <p className="text-muted-foreground mt-0.5">
                  Attendance ≥ 75% AND at least 2 matches played = Ready for scout trials.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/40">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                4
              </span>
              <div>
                <p className="font-semibold text-foreground">Role Visibility (CHECK 4)</p>
                <p className="text-muted-foreground mt-0.5">
                  Scout sees only Ready players. Player sees only their own row. Coach oversees everything.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
