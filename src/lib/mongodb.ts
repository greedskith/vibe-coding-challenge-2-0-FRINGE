import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient>;

if (uri) {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };
  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    const promise = client.connect();
    promise.catch(() => {});
    globalWithMongo._mongoClientPromise = promise;
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  const p = Promise.reject(new Error('Missing environment variable: "MONGODB_URI"'));
  p.catch(() => {});
  clientPromise = p;
}

export default clientPromise;
