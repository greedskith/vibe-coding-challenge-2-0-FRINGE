import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    let sessionObjectId: ObjectId;
    try {
      sessionObjectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 });
    }

    const session = await db.collection("sessions").findOne({ _id: sessionObjectId });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Populate player details if attendance exists
    if (Array.isArray(session.attendance) && session.attendance.length > 0) {
      const playerIds = session.attendance.map((a: any) => a.playerId);
      const players = await db
        .collection("players")
        .find({ _id: { $in: playerIds } })
        .toArray();
      const playerMap = new Map(players.map((p) => [p._id.toString(), p.name]));
      return NextResponse.json({
        ...session,
        attendance: session.attendance.map((a: any) => ({
          ...a,
          playerName: playerMap.get(a.playerId?.toString()) || a.playerName || "",
        })),
      });
    }

    return NextResponse.json(session);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await getDb();

    let sessionObjectId: ObjectId;
    try {
      sessionObjectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 });
    }

    const session = await db.collection("sessions").findOne({ _id: sessionObjectId });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Guard: closed sessions are permanently locked and immutable
    if (session.status === "closed") {
      return NextResponse.json(
        {
          error:
            body.status === "closed"
              ? "Session is already closed"
              : "Session is locked. Cannot modify attendance.",
        },
        { status: 400 }
      );
    }

    // Handle closing/locking session
    if (body.status === "closed") {
      await db.collection("sessions").updateOne(
        { _id: sessionObjectId },
        { $set: { status: "closed" } }
      );
      const updated = await db.collection("sessions").findOne({ _id: sessionObjectId });
      return NextResponse.json(updated);
    }

    let updatedAttendance = Array.isArray(session.attendance) ? [...session.attendance] : [];

    // Single player toggle: { playerId, status }
    if (body.playerId && body.status) {
      const pIdStr = body.playerId.toString();
      const existingIdx = updatedAttendance.findIndex(
        (a: any) => a.playerId?.toString() === pIdStr
      );

      if (existingIdx >= 0) {
        updatedAttendance[existingIdx].status = body.status;
      } else {
        let pId = body.playerId;
        try {
          pId = new ObjectId(body.playerId);
        } catch {}
        updatedAttendance.push({
          playerId: pId,
          status: body.status,
        });
      }
    }

    // Bulk attendance array update: { attendance: [...] }
    if (Array.isArray(body.attendance)) {
      updatedAttendance = body.attendance.map((a: any) => {
        let pId = a.playerId;
        if (typeof pId === "string") {
          try {
            pId = new ObjectId(pId);
          } catch {}
        }
        return {
          ...a,
          playerId: pId,
          status: a.status === "present" ? "present" : "absent",
        };
      });
    }

    await db.collection("sessions").updateOne(
      { _id: sessionObjectId },
      { $set: { attendance: updatedAttendance } }
    );

    const updated = await db.collection("sessions").findOne({ _id: sessionObjectId });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const PUT = PATCH;
