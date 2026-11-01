import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const matches = await db.collection("matches").find().sort({ date: -1 }).toArray();
    return NextResponse.json(matches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, sport, opponent, scores } = body;

    if (!date) {
      return NextResponse.json({ error: "Match date is required" }, { status: 400 });
    }

    if (!Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json({ error: "At least one player score is required" }, { status: 400 });
    }

    const db = await getDb();

    // STRICT CHECK 2: Verify attendance on this match date
    // Match sport-specific session first, falling back to date
    const matchSport = (sport || "Football").trim();
    let session = await db.collection("sessions").findOne({ date, sport: matchSport });
    if (!session) {
      session = await db.collection("sessions").findOne({ date });
    }

    if (session && Array.isArray(session.attendance)) {
      for (const entry of scores) {
        const pIdStr = entry.playerId?.toString();
        const record = session.attendance.find(
          (a: any) => a.playerId?.toString() === pIdStr
        );

        if (!record || record.status === "absent") {
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

    const matchDoc = {
      date,
      sport: (sport || "Football").trim(),
      opponent: (opponent || "Friendly").trim(),
      scores: scores.map((s: any) => ({
        playerId: new ObjectId(s.playerId),
        score: Math.max(0, Number(s.score) || 0),
      })),
    };

    const res = await db.collection("matches").insertOne(matchDoc);
    return NextResponse.json({ ...matchDoc, _id: res.insertedId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
