import clientPromise from "./mongodb";
import { Db } from "mongodb";

let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const client = await clientPromise;
  cachedDb = client.db("academy-desk");
  return cachedDb;
}
