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
} from "./db";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { ONE_YEAR_MS } from "@shared/const";

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
          performanceDate: z.date().optional(),
          status: z.enum(["pending", "scheduled", "confirmed", "completed", "cancelled"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return await updatePerformance(id, data, ctx.db);
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
        return await getSetting(input.key, ctx.db);
      }),
    update: protectedProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return await updateSetting(input.key, input.value, ctx.db);
      }),
  }),
});

export type AppRouter = typeof appRouter;
