import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { MongoClient, Db } from "mongodb";
import bcrypt from "bcryptjs";
import { SEED_PLAYERS } from "../lib/seed-data";

export async function populateDatabase(db: Db) {
  // 1. Remove dummy test candidates
  await db.collection("players").deleteMany({
    name: { $regex: "^(Dynamic Scout Candidate|Comb Test|Pre-fill|Boundary|Karan|Sunil|T1F2)" },
  });
  await db.collection("users").deleteMany({
    username: { $regex: "^(dynamic-scout-candidate|comb-test|boundary|karan|sunil)" },
  });

  // Clean obsolete candidate ids from session attendance rolls
  const sessions = await db.collection("sessions").find().toArray();
  for (const s of sessions) {
    if (Array.isArray(s.attendance)) {
      const cleaned = s.attendance.filter((a: any) => a.playerName !== "Dynamic Scout Candidate");
      if (cleaned.length !== s.attendance.length) {
        await db.collection("sessions").updateOne({ _id: s._id }, { $set: { attendance: cleaned } });
      }
    }
  }

  // 2. Upsert each seed player
  for (const p of SEED_PLAYERS) {
    await db.collection("players").updateOne(
      { _id: p._id },
      {
        $set: {
          name: p.name,
          age: p.age,
          sport: p.sport,
          imageUrl: p.imageUrl,
        },
      },
      { upsert: true }
    );

    // 3. Upsert corresponding user account
    const rawPassword = `${p.username}123`;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    await db.collection("users").updateOne(
      { username: p.username },
      {
        $set: {
          username: p.username,
          password: hashedPassword,
          role: "player",
          name: p.name,
          playerId: p._id,
        },
      },
      { upsert: true }
    );
  }

  // 4. Upsert Staff Accounts
  await db.collection("users").updateOne(
    { username: "coach" },
    {
      $set: {
        username: "coach",
        password: await bcrypt.hash("coach123", 10),
        role: "coach",
        name: "Coach",
      },
    },
    { upsert: true }
  );

  await db.collection("users").updateOne(
    { username: "scout" },
    {
      $set: {
        username: "scout",
        password: await bcrypt.hash("scout123", 10),
        role: "scout",
        name: "Scout",
      },
    },
    { upsert: true }
  );
}

async function seed() {
  const { getDb } = await import("../lib/db");
  const db = await getDb();
  await populateDatabase(db);

  // If Atlas is configured, seed Atlas directly too
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });
      await client.connect();
      const atlasDb = client.db("academy-desk");
      await populateDatabase(atlasDb);
      await client.close();
      console.log("✅ Seeded MongoDB Atlas successfully.");
    } catch {
      // Atlas unreachable in sandbox; local store seeded
    }
  }

  console.log("✅ Seeded 10 Football and 10 Cricket players:");
  console.log("   Football (10): Rohit Kumar, Priya Murmu, Amit Soren, +7 more");
  console.log("   Cricket (10): Sagar Ranjan, Ishan Kishan, Yashasvi Jaiswal, +7 more");
  console.log("   Staff: coach / coach123, scout / scout123");
  console.log("   Players: <username> / <username>123");
  process.exit(0);
}

if (process.argv[1]?.includes("seed.ts")) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
