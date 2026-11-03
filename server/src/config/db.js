import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDB(uri = env.MONGODB_URI, dbName = env.MONGODB_DB) {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

/** Human-readable connection state for /api/health. */
export function dbState() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ?? 'unknown';
}
