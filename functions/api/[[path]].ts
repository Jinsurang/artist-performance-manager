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
                const db = await getDb(env.DATABASE_URL);
                let user = null;
                try {
                    user = await sdk.authenticateRequest(request.headers.get('cookie') || undefined, db, env);
                } catch (e) {
                    // Auth is optional
                }
                return { env, db, user };
            },
            onError: ({ path, error }) => {
                console.error(`[tRPC Error] ${path}:`, error);
                // The error might contain 'originalError' which is the PG error
                if (error.cause) {
                    console.error("[Original Error]", error.cause);
                }
            }
        }).catch(err => {
            console.error("[Worker Crash]", err);
            return new Response(JSON.stringify({
                error: {
                    message: err.message,
                    stack: err.stack,
                    detail: err.detail || err.hint || (err as any).originalError?.message
                }
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        });
    }

    return next();
};
