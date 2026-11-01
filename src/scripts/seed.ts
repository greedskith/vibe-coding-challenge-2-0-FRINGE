import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("academy-desk");

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

  console.log("✅ Seeded:");
  console.log("   coach / coach123");
  console.log("   scout / scout123");

  await client.close();
}

seed().catch(console.error);
