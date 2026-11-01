import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { Player, ReadyResult } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // e.g. "readyOnly"
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
          (a: any) => a.playerId?.toString() === pIdStr
        );
        if (record) {
          sessionsHeld++;
          if (record.status === "present") {
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
      const matchCount = matches.filter((m) =>
        Array.isArray(m.scores) &&
        m.scores.some((s: any) => s.playerId?.toString() === pIdStr)
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

    let filtered = results;

    // CHECK 4: Scout sees only ready players
    if (filter === "readyOnly") {
      filtered = filtered.filter((r) => r.isReady);
    }

    // CHECK 4: Player sees only their own row
    if (playerId) {
      filtered = filtered.filter(
        (r) => r.player._id?.toString() === playerId.toString()
      );
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
