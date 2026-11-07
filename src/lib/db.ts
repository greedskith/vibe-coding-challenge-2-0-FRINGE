import { getMongoClient } from "./mongodb";
import { Db } from "mongodb";
import { getLocalDb } from "./local-db";

let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return getLocalDb() as unknown as Db;
  }

  try {
    const client = await getMongoClient();
    const db = client.db("academy-desk");
    await db.command({ ping: 1 });
    cachedDb = db;
    return cachedDb;
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("MongoDB Atlas connection fallback:", err instanceof Error ? err.message : String(err));
    }
    // Return local db fallback for this request only; do NOT cache permanently
    return getLocalDb() as unknown as Db;
  }
}
