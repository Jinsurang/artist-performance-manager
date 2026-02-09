import { getDb } from "../db";
import { sdk } from "./sdk";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  user: User | null;
  db?: any; // Drizzle instance
  env?: any; // Cloudflare environment
  req?: any; // Legacy Express request
  res?: any; // Legacy Express response
};

export async function createContext(
  opts: any
): Promise<TrpcContext> {
  // This version will be used by the Express server (local dev)
  const db = await getDb();
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req, db);
  } catch (e) {
    // Authentication is optional
  }

  return {
    user,
    db,
    req: opts.req,
    res: opts.res,
  };
}
