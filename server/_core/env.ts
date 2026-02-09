// Safe access to process.env (may not exist in Cloudflare Workers)
const safeProcessEnv = typeof process !== 'undefined' ? process.env : {};

export const getEnv = (env?: any) => ({
  appId: (env?.VITE_APP_ID || safeProcessEnv.VITE_APP_ID) ?? "",
  cookieSecret: (env?.JWT_SECRET || safeProcessEnv.JWT_SECRET) ?? "",
  databaseUrl: (env?.DATABASE_URL || safeProcessEnv.DATABASE_URL) ?? "",
  oAuthServerUrl: (env?.OAUTH_SERVER_URL || safeProcessEnv.OAUTH_SERVER_URL) ?? "",
  ownerOpenId: (env?.OWNER_OPEN_ID || safeProcessEnv.OWNER_OPEN_ID) ?? "",
  isProduction: (env?.NODE_ENV === "production" || safeProcessEnv.NODE_ENV === "production"),
  forgeApiUrl: (env?.BUILT_IN_FORGE_API_URL || safeProcessEnv.BUILT_IN_FORGE_API_URL) ?? "",
  forgeApiKey: (env?.BUILT_IN_FORGE_API_KEY || safeProcessEnv.BUILT_IN_FORGE_API_KEY) ?? "",
});

export const ENV = getEnv();
