import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient>;

if (uri) {
  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
} else {
  const p = Promise.reject(new Error('Missing environment variable: "MONGODB_URI"'));
  p.catch(() => {});
  clientPromise = p;
}

export default clientPromise;
