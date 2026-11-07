import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
};

let cachedClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('Missing environment variable: "MONGODB_URI"');
  }

  if (cachedClient) {
    return cachedClient;
  }

  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
    _mongoClient?: MongoClient;
  };

  if (globalWithMongo._mongoClient) {
    cachedClient = globalWithMongo._mongoClient;
    return cachedClient;
  }

  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client
      .connect()
      .then((connectedClient) => {
        globalWithMongo._mongoClient = connectedClient;
        cachedClient = connectedClient;
        return connectedClient;
      })
      .catch((err) => {
        // Clear on failure so next call can retry
        delete globalWithMongo._mongoClientPromise;
        delete globalWithMongo._mongoClient;
        cachedClient = null;
        throw err;
      });
  }

  return globalWithMongo._mongoClientPromise;
}

const clientPromise: Promise<MongoClient> = uri
  ? getMongoClient()
  : Promise.reject(new Error('Missing environment variable: "MONGODB_URI"'));

// Suppress unhandled rejection if not consumed immediately
clientPromise.catch(() => {});

export default clientPromise;
