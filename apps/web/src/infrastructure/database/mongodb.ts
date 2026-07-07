import mongoose from "mongoose";
import { getEnvironment } from "../config/environment";

let connectionPromise: Promise<typeof mongoose> | undefined;
export function connectMongo(): Promise<typeof mongoose> {
  connectionPromise ??= mongoose.connect(getEnvironment().MONGODB_URI, { maxPoolSize: 10, minPoolSize: 1, serverSelectionTimeoutMS: 5_000, socketTimeoutMS: 30_000, autoIndex: getEnvironment().NODE_ENV !== "production" }).catch((error: unknown) => { connectionPromise = undefined; throw error; });
  return connectionPromise;
}
export function mongoReadiness(): "connected" | "connecting" | "disconnected" { if (mongoose.connection.readyState === 1) return "connected"; if (mongoose.connection.readyState === 2) return "connecting"; return "disconnected"; }
