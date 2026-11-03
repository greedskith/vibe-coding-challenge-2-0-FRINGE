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

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid match ID format" }, { status: 400 });
    }

    const match = await db.collection("matches").findOne({ _id: new ObjectId(id) });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Populate player names if scores exist
    if (Array.isArray(match.scores) && match.scores.length > 0) {
      const allPlayerIds: ObjectId[] = [];
      match.scores.forEach((s: any) => {
        if (s.playerId) {
          try {
            allPlayerIds.push(new ObjectId(s.playerId.toString()));
          } catch {}
        }
      });

      if (allPlayerIds.length > 0) {
        const players = await db
          .collection("players")
          .find({ _id: { $in: allPlayerIds } })
          .toArray();
        const playerMap = new Map(players.map((p) => [p._id.toString(), p.name]));

        const populatedMatch = {
          ...match,
          scores: match.scores.map((s: any) => ({
            ...s,
            playerName: playerMap.get(s.playerId?.toString()) || s.playerName || "Player",
          })),
        };
        return NextResponse.json(populatedMatch);
      }
    }

    return NextResponse.json(match);
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
    const db = await getDb();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid match ID format" }, { status: 400 });
    }

    const existing = await db.collection("matches").findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const body = await req.json();
    const { date, sport, opponent, scores, outcome, coachOverrides } = body;

    const effectiveDate = (date !== undefined ? date : existing.date)?.trim();
    const effectiveSport = (sport !== undefined ? sport : existing.sport || "Football")?.trim();

    if (date !== undefined && (!date || typeof date !== "string" || !date.trim())) {
      return NextResponse.json({ error: "Match date cannot be empty" }, { status: 400 });
    }

    if (scores !== undefined) {
      if (!Array.isArray(scores) || scores.length === 0) {
        return NextResponse.json({ error: "At least one player score is required" }, { status: 400 });
      }

      const seenPlayerIds = new Set<string>();
      for (const entry of scores) {
        if (!entry?.playerId || !ObjectId.isValid(entry.playerId)) {
          return NextResponse.json({ error: "Each score must have a valid playerId" }, { status: 400 });
        }
        const pIdStr = entry.playerId.toString();
        if (seenPlayerIds.has(pIdStr)) {
          return NextResponse.json({ error: "Duplicate playerId in scores list" }, { status: 400 });
        }
        seenPlayerIds.add(pIdStr);
      }
    }

    const scoresToValidate = scores !== undefined ? scores : existing.scores;

    // Validate attendance eligibility against session
    if (scoresToValidate && Array.isArray(scoresToValidate)) {
      let session = await db.collection("sessions").findOne({
        date: effectiveDate,
        sport: { $regex: new RegExp(`^${effectiveSport}$`, "i") },
      });
      if (!session) {
        session = await db.collection("sessions").findOne({
          date: effectiveDate,
          $or: [{ sport: { $exists: false } }, { sport: null }],
        });
      }

      if (session && Array.isArray(session.attendance)) {
        for (const entry of scoresToValidate) {
          const pIdStr = entry.playerId.toString();

          const isOverridden = Boolean(
            entry.coachOverride === true ||
            (Array.isArray(coachOverrides) &&
              coachOverrides.map((x: any) => x?.toString()).includes(pIdStr)) ||
            (coachOverrides === undefined &&
              Array.isArray(existing.coachOverrides) &&
              existing.coachOverrides.map((x: any) => x?.toString()).includes(pIdStr))
          );

          if (isOverridden) {
            continue;
          }

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
                error: `Player ${pName} was absent on ${effectiveDate} and cannot participate in match`,
                refusedPlayerId: pIdStr,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    const updateFields: any = {};
    if (date !== undefined) updateFields.date = effectiveDate;
    if (sport !== undefined) updateFields.sport = effectiveSport;
    if (opponent !== undefined) updateFields.opponent = opponent.trim();
    if (outcome !== undefined && ["win", "draw", "loss"].includes(outcome.toLowerCase())) {
      updateFields.outcome = outcome.toLowerCase();
    }
    if (scores !== undefined) {
      updateFields.scores = scores.map((s: any) => ({
        playerId: new ObjectId(s.playerId),
        score: Math.max(0, Number(s.score) || 0),
        ...(s.coachOverride === true ||
        (Array.isArray(coachOverrides) &&
          coachOverrides.map((x: any) => x?.toString()).includes(s.playerId.toString()))
          ? { coachOverride: true }
          : {}),
      }));
    }
    if (coachOverrides !== undefined && Array.isArray(coachOverrides)) {
      updateFields.coachOverrides = coachOverrides;
    }

    if (Object.keys(updateFields).length > 0) {
      await db.collection("matches").updateOne(
        { _id: new ObjectId(id) },
        { $set: updateFields }
      );
    }

    const updated = await db.collection("matches").findOne({ _id: new ObjectId(id) });
    if (!updated) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Populate player names if scores exist
    if (Array.isArray(updated.scores) && updated.scores.length > 0) {
      const allPlayerIds: ObjectId[] = [];
      updated.scores.forEach((s: any) => {
        if (s.playerId) {
          try {
            allPlayerIds.push(new ObjectId(s.playerId.toString()));
          } catch {}
        }
      });

      if (allPlayerIds.length > 0) {
        const players = await db
          .collection("players")
          .find({ _id: { $in: allPlayerIds } })
          .toArray();
        const playerMap = new Map(players.map((p) => [p._id.toString(), p.name]));

        const populatedMatch = {
          ...updated,
          scores: updated.scores.map((s: any) => ({
            ...s,
            playerName: playerMap.get(s.playerId?.toString()) || s.playerName || "Player",
          })),
        };
        return NextResponse.json(populatedMatch);
      }
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

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid match ID format" }, { status: 400 });
    }

    const result = await db.collection("matches").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
