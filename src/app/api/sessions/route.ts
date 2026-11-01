import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    const sessions = await db.collection("sessions").find().sort({ date: -1 }).toArray();
    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, sport } = body;

    if (!date) {
      return NextResponse.json({ error: "Session date is required" }, { status: 400 });
    }

    const sessionSport = (sport || "Football").trim();
    const db = await getDb();

    // Check if open session already exists for this date and sport
    const existing = await db.collection("sessions").findOne({ date, sport: sessionSport });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    // Load players to pre-fill attendance list
    let targetPlayers = await db.collection("players").find({ sport: sessionSport }).toArray();
    if (targetPlayers.length === 0) {
      targetPlayers = await db.collection("players").find().toArray();
    }

    const attendance = targetPlayers.map((p) => ({
      playerId: p._id,
      status: "absent" as const, // default to absent until marked present
    }));

    const sessionDoc = {
      date,
      sport: sessionSport,
      status: "open" as const,
      attendance,
    };

    const res = await db.collection("sessions").insertOne(sessionDoc);
    return NextResponse.json({ ...sessionDoc, _id: res.insertedId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
