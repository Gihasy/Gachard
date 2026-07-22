import { MongoClient, Db } from "mongodb";

const MONGODB_URL = process.env.MONGODB_URL || "";
const DATABASE_NAME = process.env.DATABASE_NAME || "gachard";

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  if (!MONGODB_URL) {
    throw new Error("MONGODB_URL environment variable is not set");
  }

  client = new MongoClient(MONGODB_URL);
  await client.connect();
  db = client.db(DATABASE_NAME);

  return db;
}

export async function getCollection(name: string) {
  const database = await connectToDatabase();
  return database.collection(name);
}
