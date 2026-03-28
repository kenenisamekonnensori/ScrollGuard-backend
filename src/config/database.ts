import mongoose from "mongoose";

import { env } from "@/config/env.js";

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, {
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    minPoolSize: env.MONGODB_MIN_POOL_SIZE,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    retryWrites: true
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
