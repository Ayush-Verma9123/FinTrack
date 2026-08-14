import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
const databaseName = process.env.MONGODB_DB_NAME || 'fintrack';
let databasePromise;

async function connectDatabase() {
  await client.connect();
  const database = client.db(databaseName);

  // MongoDB creates these collections and indexes automatically on first use.
  await Promise.all([
    database.collection('users').createIndex({ email: 1 }, { unique: true }),
    database.collection('financeEntries').createIndex({ userId: 1, entryDate: -1, _id: -1 }),
    database.collection('financeEntries').createIndex({ userId: 1, entryType: 1 }),
    database.collection('financialGoals').createIndex({ userId: 1, createdAt: -1 }),
    database.collection('budgets').createIndex({ userId: 1, category: 1 }, { unique: true }),
  ]);

  return database;
}

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = connectDatabase().catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

export async function verifyDatabaseConnection() {
  const database = await getDatabase();
  await database.command({ ping: 1 });
}
