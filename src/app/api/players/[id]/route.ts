import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const objId = toObjectId(id);
    if (!objId) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const db = await getDb();
    const player = await db.collection("players").findOne({ _id: objId });
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const user = await db.collection("users").findOne({
      $or: [{ playerId: objId }, { playerId: id }],
    });

    return NextResponse.json({
      ...player,
      username: user?.username || player.name.toLowerCase().replace(/\s+/g, "-"),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const objId = toObjectId(id);
    if (!objId) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const body = await req.json();
    const { name, age, sport } = body;

    const updateFields: Record<string, any> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Player name cannot be empty" }, { status: 400 });
      }
      updateFields.name = name.trim();
    }
    if (age !== undefined) {
      const parsedAge = Number(age);
      if (isNaN(parsedAge) || parsedAge <= 0) {
        return NextResponse.json({ error: "Valid age is required" }, { status: 400 });
      }
      updateFields.age = parsedAge;
    }
    if (sport !== undefined) {
      if (typeof sport !== "string" || !sport.trim()) {
        return NextResponse.json({ error: "Sport cannot be empty" }, { status: 400 });
      }
      updateFields.sport = sport.trim();
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
    }

    const db = await getDb();
    const updateResult = await db.collection("players").updateOne(
      { _id: objId },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Keep users.name in sync if name was updated
    if (updateFields.name) {
      await db.collection("users").updateOne(
        { $or: [{ playerId: objId }, { playerId: id }] },
        { $set: { name: updateFields.name } }
      );
    }

    const updatedPlayer = await db.collection("players").findOne({ _id: objId });
    return NextResponse.json(updatedPlayer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const objId = toObjectId(id);
    if (!objId) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const db = await getDb();

    // Remove player document
    const deletePlayerResult = await db.collection("players").deleteOne({ _id: objId });

    // Remove linked user document (by playerId match)
    await db.collection("users").deleteMany({
      $or: [{ playerId: objId }, { playerId: id }],
    });

    if (deletePlayerResult.deletedCount === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Player and associated user deleted",
      deletedId: id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
