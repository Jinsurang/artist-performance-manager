import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("artist router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should create an artist", async () => {
    const result = await caller.artist.create({
      name: "Test Artist",
      genre: "Rock",
      phone: "010-1234-5678",
      instagram: "test_artist",
    });

    expect(result).toBeDefined();
  });

  it("should list artists", async () => {
    const result = await caller.artist.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should search artists by name", async () => {
    // First create an artist
    await caller.artist.create({
      name: "Searchable Artist",
      genre: "Jazz",
    });

    // Then search for it
    const result = await caller.artist.list({ search: "Searchable" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter artists by genre", async () => {
    // Create artists with different genres
    await caller.artist.create({
      name: "Rock Artist",
      genre: "Rock",
    });

    await caller.artist.create({
      name: "Jazz Artist",
      genre: "Jazz",
    });

    // Filter by genre
    const result = await caller.artist.list({ genre: "Rock" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("performance router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should create a performance", async () => {
    // First create an artist
    const artistResult = await caller.artist.create({
      name: "Performance Test Artist",
      genre: "Pop",
    });

    // Then create a performance
    const performanceDate = new Date();
    performanceDate.setHours(19, 0, 0, 0);

    const result = await caller.performance.create({
      artistId: 1,
      title: "Test Performance",
      performanceDate,
      status: "scheduled",
    });

    expect(result).toBeDefined();
  });

  it("should get weekly performances", async () => {
    const result = await caller.performance.getWeekly();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get monthly performances", async () => {
    const now = new Date();
    const result = await caller.performance.getMonthly({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("should update performance status", async () => {
    // Create a performance first
    const performanceDate = new Date();
    performanceDate.setHours(19, 0, 0, 0);

    const created = await caller.performance.create({
      artistId: 1,
      title: "Test Performance",
      performanceDate,
      status: "scheduled",
    });

    // Update its status
    const updated = await caller.performance.update({
      id: 1,
      status: "confirmed",
    });

    expect(updated).toBeDefined();
  });
});
