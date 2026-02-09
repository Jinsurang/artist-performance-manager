export const getEnv = (env?: any) => ({
  appId: (env?.VITE_APP_ID || process.env.VITE_APP_ID) ?? "",
  cookieSecret: (env?.JWT_SECRET || process.env.JWT_SECRET) ?? "",
  databaseUrl: (env?.DATABASE_URL || process.env.DATABASE_URL) ?? "",
  oAuthServerUrl: (env?.OAUTH_SERVER_URL || process.env.OAUTH_SERVER_URL) ?? "",
  ownerOpenId: (env?.OWNER_OPEN_ID || process.env.OWNER_OPEN_ID) ?? "",
  isProduction: (env?.NODE_ENV === "production" || process.env.NODE_ENV === "production"),
  forgeApiUrl: (env?.BUILT_IN_FORGE_API_URL || process.env.BUILT_IN_FORGE_API_URL) ?? "",
  forgeApiKey: (env?.BUILT_IN_FORGE_API_KEY || process.env.BUILT_IN_FORGE_API_KEY) ?? "",
});

export const ENV = getEnv();
