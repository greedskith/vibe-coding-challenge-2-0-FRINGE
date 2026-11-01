import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse>;
export async function GET(): Promise<NextResponse>;
export async function GET(req?: NextRequest): Promise<NextResponse> {
  try {
    const db = await getDb();
    const query: any = {};

    if (req?.url) {
      const { searchParams } = new URL(req.url);
      const dateParam = searchParams.get("date");
      const sportParam = searchParams.get("sport");
      const statusParam = searchParams.get("status");

      if (dateParam) {
        query.date = dateParam.trim();
      }
      if (sportParam) {
        query.sport = { $regex: new RegExp(`^${sportParam.trim()}$`, "i") };
      }
      if (statusParam) {
        query.status = statusParam.trim();
      }
    }

    const sessions = await db.collection("sessions").find(query).sort({ date: -1 }).toArray();

    // Populate player names if players exist
    const allPlayerIds: any[] = [];
    sessions.forEach((s) => {
      if (Array.isArray(s.attendance)) {
        s.attendance.forEach((a: any) => {
          if (a.playerId) allPlayerIds.push(a.playerId);
        });
      }
    });

    if (allPlayerIds.length > 0) {
      const players = await db
        .collection("players")
        .find({ _id: { $in: allPlayerIds } })
        .toArray();
      const playerMap = new Map(players.map((p) => [p._id.toString(), p.name]));

      const populatedSessions = sessions.map((s) => {
        if (!Array.isArray(s.attendance)) return s;
        return {
          ...s,
          attendance: s.attendance.map((a: any) => ({
            ...a,
            playerName: playerMap.get(a.playerId?.toString()) || a.playerName || "",
          })),
        };
      });
      return NextResponse.json(populatedSessions);
    }

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
      if (Array.isArray(existing.attendance) && existing.attendance.length > 0) {
        const playerIds = existing.attendance.map((a: any) => a.playerId);
        const players = await db
          .collection("players")
          .find({ _id: { $in: playerIds } })
          .toArray();
        const playerMap = new Map(players.map((p) => [p._id.toString(), p.name]));
        return NextResponse.json(
          {
            ...existing,
            attendance: existing.attendance.map((a: any) => ({
              ...a,
              playerName: playerMap.get(a.playerId?.toString()) || a.playerName || "",
            })),
          },
          { status: 200 }
        );
      }
      return NextResponse.json(existing, { status: 200 });
    }

    // Load players to pre-fill attendance list
    let targetPlayers = await db.collection("players").find({ sport: sessionSport }).toArray();
    if (targetPlayers.length === 0) {
      targetPlayers = await db.collection("players").find().toArray();
    }

    const attendance = targetPlayers.map((p) => ({
      playerId: p._id,
      playerName: p.name,
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
