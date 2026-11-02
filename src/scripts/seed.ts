import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

async function seed() {
  const { getDb } = await import("../lib/db");
  const db = await getDb();

  // Seed 3 Players if none exist
  const existingPlayers = await db.collection("players").find().toArray();
  let player1Id: ObjectId;

  if (existingPlayers.length < 3) {
    await db.collection("players").deleteMany({});
    const res = await db.collection("players").insertMany([
      {
        name: "Rohit Kumar",
        age: 17,
        sport: "Football",
        imageUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=256&q=80",
      },
      {
        name: "Priya Murmu",
        age: 16,
        sport: "Football",
        imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
      },
      {
        name: "Amit Soren",
        age: 18,
        sport: "Football",
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      },
    ]);
    player1Id = res.insertedIds[0];
  } else {
    player1Id = existingPlayers[0]._id;
  }

  // Coach
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

  // Scout
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

  // Player (Rohit)
  await db.collection("users").updateOne(
    { username: "rohit" },
    {
      $set: {
        username: "rohit",
        password: await bcrypt.hash("rohit123", 10),
        role: "player",
        name: "Rohit Kumar",
        playerId: player1Id,
      },
    },
    { upsert: true }
  );

  console.log("✅ Seeded:");
  console.log("   coach / coach123");
  console.log("   scout / scout123");
  console.log("   rohit / rohit123");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
