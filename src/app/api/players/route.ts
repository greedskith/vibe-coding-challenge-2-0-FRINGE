import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const db = await getDb();
    const players = await db.collection("players").find().sort({ name: 1 }).toArray();
    return NextResponse.json(players);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, sport } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    const db = await getDb();
    const playerDoc = {
      name: name.trim(),
      age: Number(age) || 16,
      sport: (sport || "Football").trim(),
    };

    const result = await db.collection("players").insertOne(playerDoc);
    const playerId = result.insertedId;

    // Generate credentials
    const cleanUsername = name.toLowerCase().replace(/[^a-z0-9]/g, "") || `player${Date.now() % 1000}`;
    const rawPassword = `${cleanUsername}123`;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await db.collection("users").updateOne(
      { username: cleanUsername },
      {
        $set: {
          username: cleanUsername,
          password: hashedPassword,
          role: "player",
          name: playerDoc.name,
          playerId,
        },
      },
      { upsert: true }
    );

    return NextResponse.json(
      {
        player: { ...playerDoc, _id: playerId },
        credentials: { username: cleanUsername, tempPassword: rawPassword },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
