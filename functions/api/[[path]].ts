import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";
import { getDb } from "../../server/db";
import { sdk } from "../../server/_core/sdk";

export const onRequest: any = async (context: any) => {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // tRPC handler
    if (url.pathname.startsWith("/api/trpc")) {
        return fetchRequestHandler({
            endpoint: "/api/trpc",
            req: request,
            router: appRouter,
            createContext: async () => {
                try {
                    const db = await getDb(env.DATABASE_URL);
                    if (!db) {
                        throw new Error("Cloudflare: Database not initialized");
                    }

                    let user = null;
                    try {
                        user = await sdk.authenticateRequest(request.headers.get('cookie') || undefined, db, env);
                    } catch (e) {
                        // Auth is optional
                    }

                    return {
                        env,
                        db,
                        user,
                    };
                } catch (error: any) {
                    console.error("[Worker Context Error]", error);
                    return {
                        env,
                        db: null as any,
                        user: null,
                    };
                }
            },
        });
    }

    return next();
};
