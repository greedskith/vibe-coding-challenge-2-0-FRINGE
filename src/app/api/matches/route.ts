import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const query: any = {};

    if (req.url) {
      const { searchParams } = new URL(req.url);
      const sportParam = searchParams.get("sport");
      if (sportParam) {
        query.sport = { $regex: new RegExp(`^${sportParam.trim()}$`, "i") };
      }
    }

    const matches = await db
      .collection("matches")
      .find(query)
      .sort({ date: -1, _id: -1 })
      .toArray();

    // Populate player names if scores exist
    const allPlayerIds: ObjectId[] = [];
    matches.forEach((m) => {
      if (Array.isArray(m.scores)) {
        m.scores.forEach((s: any) => {
          if (s.playerId) {
            try {
              allPlayerIds.push(new ObjectId(s.playerId.toString()));
            } catch {}
          }
        });
      }
    });

    if (allPlayerIds.length > 0) {
      const players = await db
        .collection("players")
        .find({ _id: { $in: allPlayerIds } })
        .toArray();
      const playerMap = new Map(players.map((p) => [p._id.toString(), p.name]));

      const populatedMatches = matches.map((m) => {
        if (!Array.isArray(m.scores)) return m;
        return {
          ...m,
          scores: m.scores.map((s: any) => ({
            ...s,
            playerName: playerMap.get(s.playerId?.toString()) || s.playerName || "Player",
          })),
        };
      });
      return NextResponse.json(populatedMatches);
    }

    return NextResponse.json(matches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, sport, opponent, scores, outcome } = body;

    if (!date || typeof date !== "string" || !date.trim()) {
      return NextResponse.json({ error: "Match date is required" }, { status: 400 });
    }

    if (!Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json({ error: "At least one player score is required" }, { status: 400 });
    }

    for (const entry of scores) {
      if (!entry?.playerId || !ObjectId.isValid(entry.playerId)) {
        return NextResponse.json({ error: "Each score must have a valid playerId" }, { status: 400 });
      }
    }

    const db = await getDb();

    // STRICT CHECK 2: Verify attendance on this match date
    // Match sport-specific session first, falling back to date
    const matchSport = (sport || "Football").trim();
    let session = await db.collection("sessions").findOne({
      date: date.trim(),
      sport: { $regex: new RegExp(`^${matchSport}$`, "i") },
    });
    if (!session) {
      session = await db.collection("sessions").findOne({ date: date.trim() });
    }

    if (session && Array.isArray(session.attendance)) {
      for (const entry of scores) {
        const pIdStr = entry.playerId.toString();
        const record = session.attendance.find(
          (a: any) =>
            (a.playerId?._id ? a.playerId._id.toString() : a.playerId?.toString()) === pIdStr
        );

        if (!record || record.status === "absent" || record.status !== "present") {
          let pName = "Player";
          try {
            const playerDoc = await db.collection("players").findOne({ _id: new ObjectId(pIdStr) });
            if (playerDoc?.name) pName = playerDoc.name;
          } catch {}

          return NextResponse.json(
            {
              error: `Player ${pName} was absent on ${date} and cannot participate in match`,
              refusedPlayerId: pIdStr,
            },
            { status: 400 }
          );
        }
      }
    }

    const matchDoc: any = {
      date: date.trim(),
      sport: matchSport,
      opponent: (opponent || "Friendly").trim(),
      scores: scores.map((s: any) => ({
        playerId: new ObjectId(s.playerId),
        score: Math.max(0, Number(s.score) || 0),
      })),
    };

    if (outcome && ["win", "draw", "loss"].includes(outcome.toLowerCase())) {
      matchDoc.outcome = outcome.toLowerCase();
    }

    const res = await db.collection("matches").insertOne(matchDoc);
    return NextResponse.json({ ...matchDoc, _id: res.insertedId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
