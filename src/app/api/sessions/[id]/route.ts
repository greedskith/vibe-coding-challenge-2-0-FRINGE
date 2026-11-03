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
      const playerIds: (ObjectId | string)[] = [];
      const seenIds = new Set<string>();
      session.attendance.forEach((a: any) => {
        if (a.playerId) {
          const raw = a.playerId;
          const str = raw.toString();
          if (!seenIds.has(str)) {
            seenIds.add(str);
            playerIds.push(raw);
            if (ObjectId.isValid(str)) {
              if (typeof raw === "string") {
                try {
                  playerIds.push(new ObjectId(str));
                } catch {}
              } else if (raw instanceof ObjectId) {
                playerIds.push(str);
              }
            }
          }
        }
      });

      const players = await db
        .collection("players")
        .find({ _id: { $in: playerIds as any } })
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

    const isReopening = body.status === "open";

    // Guard: closed sessions are locked unless reopening
    if (session.status === "closed" && !isReopening) {
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

    const updateFields: any = {};

    if (body.status === "closed" || body.status === "open") {
      updateFields.status = body.status;
    }

    if (body.date && typeof body.date === "string" && body.date.trim()) {
      updateFields.date = body.date.trim();
    }

    if (body.sport && typeof body.sport === "string" && body.sport.trim()) {
      updateFields.sport = body.sport.trim();
    }

    let updatedAttendance = Array.isArray(session.attendance) ? [...session.attendance] : [];
    let attendanceChanged = false;

    // Single player toggle: { playerId, status }
    if (body.playerId && body.status && body.status !== "open" && body.status !== "closed") {
      attendanceChanged = true;
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
      attendanceChanged = true;
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

    if (attendanceChanged) {
      updateFields.attendance = updatedAttendance;
    }

    if (Object.keys(updateFields).length > 0) {
      await db.collection("sessions").updateOne(
        { _id: sessionObjectId },
        { $set: updateFields }
      );
    }

    const updated = await db.collection("sessions").findOne({ _id: sessionObjectId });
    if (!updated) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(
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

    const result = await db.collection("sessions").deleteOne({ _id: sessionObjectId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
