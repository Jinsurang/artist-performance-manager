
import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { performances, artists } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Performance Deletion Verification", () => {
    let db: any;
    let testArtistId: number;

    beforeEach(async () => {
        db = await getDb();
        if (!db) throw new Error("DB not available");

        // Clean up
        await db.delete(performances).execute();
        await db.delete(artists).execute();

        // Create a test artist
        const [artist] = await db.insert(artists).values({
            name: "Test Artist",
            genre: "Pop"
        }).returning();
        testArtistId = artist.id;
    });

    it("should NOT delete other pending performances when one is confirmed", async () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        // Create 3 pending performances for today
        const [p1] = await db.insert(performances).values({
            artistId: testArtistId,
            title: "Perf 1",
            performanceDate: today,
            status: "pending"
        }).returning();

        const [p2] = await db.insert(performances).values({
            artistId: testArtistId,
            title: "Perf 2",
            performanceDate: today,
            status: "pending"
        }).returning();

        const [p3] = await db.insert(performances).values({
            artistId: testArtistId,
            title: "Perf 3",
            performanceDate: today,
            status: "pending"
        }).returning();

        console.log("Created 3 pending performances");

        // Confirm p1 via TRPC
        const caller = appRouter.createCaller({ db, user: { role: 'admin', openId: 'test' } } as any);
        await caller.performance.confirm({ id: p1.id });

        console.log("Confirmed Perf 1");

        // Check if others still exist
        const allPerfs = await db.select().from(performances).execute();
        console.log("Current performances in DB:", allPerfs.length);

        const p1Status = allPerfs.find((p: any) => p.id === p1.id)?.status;
        const others = allPerfs.filter((p: any) => p.id !== p1.id);

        expect(p1Status).toBe("confirmed");
        expect(others.length).toBe(2);
        expect(others.every((p: any) => p.status === "pending")).toBe(true);
    });
});
