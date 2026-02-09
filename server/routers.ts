import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
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
  getWeeklyPerformances,
  getMonthlyPerformances,
  createNotice,
  getNotices,
  searchPublicArtists,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
      .query(async ({ input }) => {
        return await getArtists(input.search, input.genre);
      }),
    searchPublic: publicProcedure
      .input(z.object({ name: z.string().min(1) }))
      .query(async ({ input }) => {
        return await searchPublicArtists(input.name);
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
          instruments: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createArtist(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getArtistById(input.id);
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
          instruments: z.string().optional(),
          isFavorite: z.boolean().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateArtist(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteArtist(input.id);
      }),
    getStats: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getArtistStats(input.id);
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
      .query(async ({ input }) => {
        return await getPerformances(input.startDate, input.endDate);
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
      .mutation(async ({ input }) => {
        return await createPerformance(input);
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
      .mutation(async ({ input }) => {
        return await createPerformance({ ...input, status: "pending" });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getPerformanceById(input.id);
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
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updatePerformance(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deletePerformance(input.id);
      }),
    getWeekly: protectedProcedure.query(async () => {
      return await getWeeklyPerformances();
    }),
    getMonthly: publicProcedure
      .input(
        z.object({
          year: z.number(),
          month: z.number().min(1).max(12),
        })
      )
      .query(async ({ input }) => {
        return await getMonthlyPerformances(input.year, input.month);
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
      .mutation(async ({ input }) => {
        return await createNotice(input);
      }),
    list: protectedProcedure
      .query(async () => {
        return await getNotices();
      }),
  }),
});

export type AppRouter = typeof appRouter;
