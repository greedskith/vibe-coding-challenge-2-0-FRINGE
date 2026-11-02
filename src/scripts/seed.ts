import { getDb } from "../lib/db";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function seed() {
  const db = await getDb();

  // Seed 3 Players if none exist
  const existingPlayers = await db.collection("players").find().toArray();
  let player1Id: ObjectId;

  if (existingPlayers.length < 3) {
    await db.collection("players").deleteMany({});
    const res = await db.collection("players").insertMany([
      { name: "Rohit Kumar", age: 17, sport: "Football" },
      { name: "Priya Murmu", age: 16, sport: "Football" },
      { name: "Amit Soren", age: 18, sport: "Football" },
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
}

seed().catch(console.error);
