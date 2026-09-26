import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createArtist,
  getArtists,
  getArtistById,
  updateArtist,
  deleteArtist,
  getArtistStats,
  createPerformance,
  getPerformances,
  getPerformanceById,
  updatePerformance,
  deletePerformance,
  deleteOtherDailyPendings,
  getWeeklyPerformances,
  getMonthlyPerformances,
  createNotice,
  getNotices,
  updateNotice,
  deleteNotice,
  searchPublicArtists,
  upsertUser,
  getSetting,
  updateSetting,
  getMonthlySettlement,
  updateSettlement,
  setSettlementPaid,
  replacePerformanceTips,
  getTipsForMonth,
  getTipsForPerformanceIds,
  findArtistsForPortal,
  countRecentPortalFailures,
  recordPortalAttempt,
  getPortalSettlement,
} from "./db";
import { sdk } from "./_core/sdk";
import { ENV, getEnv } from "./_core/env";
import { ONE_YEAR_MS } from "@shared/const";
import { SignJWT, jwtVerify } from "jose";

const PORTAL_SCOPE = "artist-portal";
const PORTAL_TOKEN_TTL_SEC = 60 * 60;
const PORTAL_LOCK_WINDOW_MIN = 15;
const PORTAL_MAX_FAILURES = 5;

const portalSecret = (env: any) => new TextEncoder().encode(getEnv(env).cookieSecret);

async function verifyPortalToken(token: string, env: any): Promise<number[]> {
  try {
    const { payload } = await jwtVerify(token, portalSecret(env), { algorithms: ["HS256"] });
    if (payload.scope !== PORTAL_SCOPE || !Array.isArray(payload.artistIds)) throw new Error("bad scope");
    return (payload.artistIds as unknown[]).map(Number).filter(n => Number.isInteger(n) && n > 0);
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "조회 세션이 만료되었습니다. 다시 확인해주세요." });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    adminLogin: publicProcedure
      .input(z.object({ passcode: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (input.passcode !== ENV.ownerOpenId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Passcode incorrect" });
        }

        // Auto-create/upsert the admin user
        await upsertUser({
          openId: ENV.ownerOpenId,
          name: "Administrator",
          role: "admin",
        }, ctx.db);

        // Create session
        const sessionToken = await sdk.createSessionToken(ENV.ownerOpenId, {
          name: "Administrator",
          env: ctx.env,
        });

        // Set cookie
        if (ctx.res) {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });
        }

        return { success: true };
      }),
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      if (ctx.res && typeof ctx.res.clearCookie === 'function') {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      }
      return {
        success: true,
      } as const;
    }),
  }),

  artist: router({
    list: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
          genre: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const artists = await getArtists(input.search, input.genre, ctx.db);
        return artists.map((a: any) => ({
          ...a,
          genres: a.genre ? a.genre.split(',').map((g: string) => g.trim()) : []
        }));
      }),
    searchPublic: publicProcedure
      .input(z.object({ name: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        return await searchPublicArtists(input.name, ctx.db);
      }),
    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          genre: z.string().min(1),
          phone: z.string().optional(),
          instagram: z.string().optional(),
          grade: z.string().optional(),
          availableTime: z.string().optional(),
          preferredDays: z.string().optional(),
          instruments: z.string().optional(),
          memberCount: z.number().default(1),
          notes: z.string().optional(),
          realName: z.string().optional(),
          residentNumber: z.string().optional(),
          bankAccount: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const artist = await createArtist(input, ctx.db);
        if (!artist) return null;
        return {
          ...artist,
          genres: artist.genre ? artist.genre.split(',').map((g: string) => g.trim()) : []
        };
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getArtistById(input.id, ctx.db);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          genre: z.string().optional(),
          phone: z.string().optional(),
          instagram: z.string().optional(),
          grade: z.string().optional(),
          availableTime: z.string().optional(),
          preferredDays: z.string().optional(),
          instruments: z.string().optional(),
          memberCount: z.number().optional(),
          isFavorite: z.boolean().optional(),
          notes: z.string().optional(),
          realName: z.string().optional(),
          residentNumber: z.string().optional(),
          bankAccount: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return await updateArtist(id, data, ctx.db);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await deleteArtist(input.id, ctx.db);
      }),
    getStats: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getArtistStats(input.id, ctx.db);
      }),
  }),

  performance: router({
    list: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        return await getPerformances(input.startDate, input.endDate, ctx.db);
      }),
    create: protectedProcedure
      .input(
        z.object({
          artistId: z.number(),
          title: z.string(),
          performanceDate: z.date(),
          status: z.enum(["pending", "scheduled", "confirmed", "completed", "cancelled"]).default("scheduled"),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createPerformance(input, ctx.db);
      }),
    createPending: publicProcedure
      .input(
        z.object({
          artistId: z.number(),
          title: z.string(),
          performanceDate: z.date(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createPerformance({ ...input, status: "pending" }, ctx.db);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await getPerformanceById(input.id, ctx.db);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          artistId: z.number().optional(),
          title: z.string().optional(),
          performanceDate: z.date().optional(),
          status: z.enum(["pending", "scheduled", "confirmed", "completed", "cancelled"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        // 아티스트가 바뀌면 이전 팀 기준으로 입력한 실제 인원은 의미가 없으므로 초기화
        const patch = data.artistId !== undefined ? { ...data, actualMemberCount: null } : data;
        return await updatePerformance(id, patch, ctx.db);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await deletePerformance(input.id, ctx.db);
      }),
    confirm: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const perf = await getPerformanceById(input.id, ctx.db);
        if (!perf) throw new TRPCError({ code: "NOT_FOUND" });

        // 1. Confirm this one
        await updatePerformance(input.id, { status: "confirmed" }, ctx.db);

        // 2. Do NOT delete others (user requested to keep them)
        // await deleteOtherDailyPendings(input.id, perf.performanceDate, ctx.db);

        return { success: true };
      }),
    getWeekly: protectedProcedure.query(async ({ ctx }) => {
      return await getWeeklyPerformances(ctx.db);
    }),
    getMonthly: publicProcedure
      .input(
        z.object({
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .query(async ({ input, ctx }) => {
        return await getMonthlyPerformances(input.year, input.month, ctx.db);
      }),
  }),

  settlement: router({
    getMonthly: protectedProcedure
      .input(
        z.object({
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .query(async ({ input, ctx }) => {
        return await getMonthlySettlement(input.year, input.month, ctx.db);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          actualMemberCount: z.number().int().min(0).nullable().optional(),
          perPersonRate: z.number().int().min(0).nullable().optional(),
          extraTip: z.number().int().min(0).optional(),
          setCount: z.number().int().min(1).max(2).nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return await updateSettlement(id, data, ctx.db);
      }),
    setPaid: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1), paid: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await setSettlementPaid(input.ids, input.paid, ctx.db);
        return { success: true };
      }),
    getMonthlyTips: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
      .query(async ({ input, ctx }) => {
        return await getTipsForMonth(input.year, input.month, ctx.db);
      }),
    applyTips: protectedProcedure
      .input(
        z.object({
          entries: z.array(
            z.object({
              performanceId: z.number(),
              tips: z.array(
                z.object({
                  tippedAt: z.date(),
                  amount: z.number().int().min(0),
                  depositor: z.string().max(100).optional().nullable(),
                })
              ),
            })
          ).min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        for (const entry of input.entries) {
          await replacePerformanceTips(entry.performanceId, entry.tips, ctx.db);
        }
        return { success: true, count: input.entries.length };
      }),
  }),

  artistPortal: router({
    login: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).max(50),
          phoneLast4: z.string().regex(/^\d{4}$/),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const nameKey = input.name.trim().toLowerCase();
        const failures = await countRecentPortalFailures(nameKey, PORTAL_LOCK_WINDOW_MIN, ctx.db);
        if (failures >= PORTAL_MAX_FAILURES) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "확인 시도가 너무 많습니다. 15분 후 다시 시도해주세요." });
        }

        const matched = await findArtistsForPortal(input.name, input.phoneLast4, ctx.db);
        if (matched.length === 0) {
          await recordPortalAttempt(nameKey, false, ctx.db);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "일치하는 정보가 없습니다. 담당자 실명과 연락처 뒷 4자리를 확인해주세요." });
        }
        await recordPortalAttempt(nameKey, true, ctx.db);

        const expiresAt = Math.floor(Date.now() / 1000) + PORTAL_TOKEN_TTL_SEC;
        const token = await new SignJWT({ scope: PORTAL_SCOPE, artistIds: matched.map((a: any) => a.id) })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setIssuedAt()
          .setExpirationTime(expiresAt)
          .sign(portalSecret(ctx.env));

        return {
          token,
          expiresAt: expiresAt * 1000,
          realName: matched[0].realName,
          artists: matched.map((a: any) => ({ id: a.id, name: a.name })),
        };
      }),
    getSettlement: publicProcedure
      .input(z.object({ token: z.string(), year: z.number(), month: z.number().min(1).max(12) }))
      .query(async ({ input, ctx }) => {
        const artistIds = await verifyPortalToken(input.token, ctx.env);
        const rows = await getPortalSettlement(artistIds, input.year, input.month, ctx.db);
        const tips = await getTipsForPerformanceIds(rows.map((r: any) => r.id), ctx.db);
        const defaultRateSetting = (await getSetting("settlement_default_rate", ctx.db)) ?? null;
        return { rows, tips, defaultRateSetting };
      }),
  }),

  notice: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createNotice(input, ctx.db);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          content: z.string().min(1).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return await updateNotice(id, data, ctx.db);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await deleteNotice(input.id, ctx.db);
      }),
    list: publicProcedure
      .query(async ({ ctx }) => {
        return await getNotices(ctx.db);
      }),
    getLatest: publicProcedure
      .query(async ({ ctx }) => {
        const notices = await getNotices(ctx.db);
        return notices[0] || null;
      }),
  }),

  settings: router({
    get: protectedProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input, ctx }) => {
        return (await getSetting(input.key, ctx.db)) ?? null;
      }),
    update: protectedProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return await updateSetting(input.key, input.value, ctx.db);
      }),
  }),
});

export type AppRouter = typeof appRouter;
