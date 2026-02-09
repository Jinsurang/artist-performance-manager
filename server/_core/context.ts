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
  // For Cloudflare, we use a separate context initializer in the handler
  return {
    user: null,
    req: opts.req,
    res: opts.res,
  };
}
