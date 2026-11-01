import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const db = await getDb();
    const players = await db.collection("players").find().sort({ name: 1 }).toArray();
    const users = await db.collection("users").find({ role: "player" }).toArray();

    const userMap = new Map<string, string>();
    for (const u of users) {
      if (u.playerId) {
        userMap.set(u.playerId.toString(), u.username);
      }
    }

    const enhancedPlayers = players.map((p) => ({
      ...p,
      username: userMap.get(p._id?.toString() || "") || p.name.toLowerCase().replace(/\s+/g, "-"),
    }));

    return NextResponse.json(enhancedPlayers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, sport, password } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const parsedAge = Number(age);
    if (isNaN(parsedAge) || parsedAge <= 0) {
      return NextResponse.json({ error: "Valid age is required" }, { status: 400 });
    }

    const selectedSport = (sport || "cricket").trim();
    const db = await getDb();

    // 1. Insert into `players` → get insertedId
    const playerDoc = {
      name: trimmedName,
      age: parsedAge,
      sport: selectedSport,
    };
    const playerResult = await db.collection("players").insertOne(playerDoc);
    const playerId = playerResult.insertedId;

    // 2. Hash password with bcrypt
    // 3. username = name.toLowerCase().replace(/\s+/g, "-")
    const username = trimmedName.toLowerCase().replace(/\s+/g, "-");
    const rawPassword =
      password && String(password).trim()
        ? String(password).trim()
        : `${username}123`;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 4. Insert into `users` with { role: "player", playerId: insertedId }
    await db.collection("users").updateOne(
      { username },
      {
        $set: {
          username,
          password: hashedPassword,
          role: "player",
          name: trimmedName,
          playerId,
        },
      },
      { upsert: true }
    );

    // 5. Return created player
    const createdPlayer = {
      _id: playerId,
      ...playerDoc,
      username,
    };

    return NextResponse.json(
      {
        ...createdPlayer,
        player: createdPlayer,
        credentials: { username, tempPassword: rawPassword },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
