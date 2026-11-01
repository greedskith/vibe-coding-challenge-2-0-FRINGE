import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { Player, ReadyResult } from "@/lib/types";

export interface EnrichedReadyResult extends ReadyResult {
  attendanceHistory?: Array<{
    sessionId: string;
    date: string;
    sport: string;
    status: "PRESENT" | "ABSENT";
  }>;
  matchHistory?: Array<{
    matchId: string;
    date: string;
    sport: string;
    opponent?: string;
    outcome?: "win" | "draw" | "loss";
    score?: number;
    scores?: any[];
    player1Score: number;
    player2Score: number;
  }>;
}

export async function GET(req: NextRequest): Promise<NextResponse>;
export async function GET(): Promise<NextResponse>;
export async function GET(req?: NextRequest): Promise<NextResponse> {
  try {
    let searchParams: URLSearchParams;
    try {
      searchParams = new URL(req?.url || "http://localhost:3000/api/ready").searchParams;
    } catch {
      searchParams = new URL("http://localhost:3000/api/ready").searchParams;
    }

    const filter = searchParams.get("filter"); // e.g. "readyOnly"
    const readyOnlyParam = searchParams.get("readyOnly"); // e.g. "true"
    const playerId = searchParams.get("playerId");

    const db = await getDb();
    const [players, sessions, matches] = await Promise.all([
      db.collection("players").find().sort({ name: 1 }).toArray(),
      db.collection("sessions").find().toArray(),
      db.collection("matches").find().toArray(),
    ]);

    const results: ReadyResult[] = (players as unknown as Player[]).map((player) => {
      const pIdStr = player._id?.toString();

      // Count sessions where this player is enrolled/recorded for their sport
      const relevantSessions = sessions.filter(
        (s) => !s.sport || !player.sport || s.sport === player.sport
      );
      let sessionsHeld = 0;
      let sessionsPresent = 0;

      for (const session of relevantSessions) {
        if (!Array.isArray(session.attendance)) continue;
        const record = session.attendance.find(
          (a: any) =>
            (a.playerId?._id ? a.playerId._id.toString() : a.playerId?.toString()) === pIdStr
        );
        if (record) {
          sessionsHeld++;
          if (record.status === "present" || record.status === "PRESENT") {
            sessionsPresent++;
          }
        }
      }

      // If sport sessions exist in the system but player was not explicitly in array, fallback to sport sessions
      if (sessionsHeld === 0 && relevantSessions.length > 0) {
        sessionsHeld = relevantSessions.length;
      }

      const attendancePct =
        sessionsHeld > 0 ? Math.round((sessionsPresent / sessionsHeld) * 100) : 0;

      // Count matches this player participated in
      const matchCount = matches.filter(
        (m) =>
          Array.isArray(m.scores) &&
          m.scores.some(
            (s: any) =>
              (s.playerId?._id ? s.playerId._id.toString() : s.playerId?.toString()) === pIdStr
          )
      ).length;

      // STRICT CHECK 3: Attendance >= 75% AND >= 2 matches
      const isReady = attendancePct >= 75 && matchCount >= 2;

      return {
        player,
        sessionsHeld,
        sessionsPresent,
        attendancePct,
        matchCount,
        isReady,
      };
    });

    let filtered: EnrichedReadyResult[] = results;

    // CHECK 4: Filter strictly to that player and enrich with attendanceHistory and matchHistory
    if (playerId) {
      const pIdTarget = playerId.trim();
      filtered = filtered
        .filter((r) => r.player._id?.toString() === pIdTarget)
        .map((r) => {
          const pIdStr = r.player._id?.toString() || pIdTarget;

          const relevantSessions = sessions.filter(
            (s) => !s.sport || !r.player.sport || s.sport === r.player.sport
          );

          let attendanceHistory = relevantSessions
            .filter(
              (s) =>
                Array.isArray(s.attendance) &&
                s.attendance.some(
                  (a: any) =>
                    (a.playerId?._id
                      ? a.playerId._id.toString()
                      : a.playerId?.toString()) === pIdStr
                )
            )
            .map((s) => {
              const record = s.attendance.find(
                (a: any) =>
                  (a.playerId?._id
                    ? a.playerId._id.toString()
                    : a.playerId?.toString()) === pIdStr
              );
              const isPres =
                record?.status === "present" || record?.status === "PRESENT";
              return {
                sessionId: s._id?.toString() || "",
                date: s.date || "",
                sport: s.sport || r.player.sport || "Football",
                status: (isPres ? "PRESENT" : "ABSENT") as "PRESENT" | "ABSENT",
              };
            });

          if (attendanceHistory.length === 0 && relevantSessions.length > 0) {
            attendanceHistory = relevantSessions.map((s) => ({
              sessionId: s._id?.toString() || "",
              date: s.date || "",
              sport: s.sport || r.player.sport || "Football",
              status: "ABSENT" as const,
            }));
          }

          attendanceHistory.sort((a, b) => b.date.localeCompare(a.date));

          const matchHistory = matches
            .filter(
              (m) =>
                Array.isArray(m.scores) &&
                m.scores.some(
                  (s: any) =>
                    (s.playerId?._id
                      ? s.playerId._id.toString()
                      : s.playerId?.toString()) === pIdStr
                )
            )
            .map((m) => {
              const myScoreEntry = m.scores.find(
                (s: any) =>
                  (s.playerId?._id
                    ? s.playerId._id.toString()
                    : s.playerId?.toString()) === pIdStr
              );
              const myScore = Number(myScoreEntry?.score) || 0;
              return {
                matchId: m._id?.toString() || "",
                date: m.date || "",
                sport: m.sport || r.player.sport || "Football",
                opponent: m.opponent || "Friendly",
                outcome: m.outcome,
                score: myScore,
                scores: m.scores,
                player1Score: Number(m.scores?.[0]?.score) || 0,
                player2Score: Number(m.scores?.[1]?.score) || 0,
              };
            })
            .sort((a, b) => b.date.localeCompare(a.date));

          return {
            ...r,
            attendanceHistory,
            matchHistory,
          };
        });
    }

    // CHECK 4 & R1: readyOnly=true or filter=readyOnly
    const isReadyOnly = readyOnlyParam === "true" || filter === "readyOnly";
    if (isReadyOnly) {
      filtered = filtered.filter((r) => r.isReady);
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
