import clientPromise from "./mongodb";
import { Db } from "mongodb";
import { getLocalDb } from "./local-db";

let cachedDb: Db | null = null;
let useLocal = false;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  if (useLocal) {
    cachedDb = getLocalDb() as unknown as Db;
    return cachedDb;
  }

  try {
    const client = await Promise.race([
      clientPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Atlas DB connection timeout")), 7000)
      ),
    ]);
    const db = client.db("academy-desk");
    await db.command({ ping: 1 });
    cachedDb = db;
    return cachedDb;
  } catch (err: unknown) {
    // Atlas unreachable, cache local database fallback permanently
    if (process.env.NODE_ENV !== "test") {
      console.warn("MongoDB connection fallback to LocalDb:", err instanceof Error ? err.message : String(err));
    }
    useLocal = true;
    cachedDb = getLocalDb() as unknown as Db;
    return cachedDb;
  }
}
