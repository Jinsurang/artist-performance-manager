import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, artists, performances, notices, InsertArtist, InsertPerformance, InsertNotice } from "../drizzle/schema";
import { ENV } from './_core/env';

// Safe access to process.env (may not exist in Cloudflare Workers)
const safeProcessEnv = typeof process !== 'undefined' ? process.env : {};

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb(databaseUrl?: string) {
  const url = databaseUrl || safeProcessEnv.DATABASE_URL;
  if (!_db && url) {
    try {
      const client = postgres(url);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser, dbInstance?: any): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = dbInstance || await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, any> = {};

    const textFields = ["name", "email", "loginMethod"] as const;

    textFields.forEach(field => {
      const value = user[field];
      if (value !== undefined) {
        const normalized = value ?? null;
        (values as any)[field] = normalized;
        updateSet[field] = normalized;
      }
    });

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Artist queries
 */
export async function createArtist(data: InsertArtist, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  const [newArtist] = await db.insert(artists).values(data).returning();
  return newArtist;
}

export async function getArtists(search?: string, genre?: string, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];

  let query = db.select().from(artists).$dynamic();

  if (search) {
    query = query.where(sql`artists.name ILIKE ${`%${search}%`}`);
  }
  if (genre) {
    query = query.where(eq(artists.genre, genre));
  }

  return await query;
}

export async function searchPublicArtists(name: string, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];

  return await db.select({
    id: artists.id,
    name: artists.name,
    instruments: artists.instruments,
  })
    .from(artists)
    .where(sql`artists.name ILIKE ${`%${name}%`}`)
    .limit(10);
}

export async function getArtistById(id: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return undefined;
  const result = await db.select().from(artists).where(eq(artists.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateArtist(id: number, data: Partial<InsertArtist>, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(artists).set(data).where(eq(artists.id, id));
}

export async function deleteArtist(id: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(artists).where(eq(artists.id, id));
}

/**
 * Performance queries
 */
export async function createPerformance(data: InsertPerformance, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  const [newPerformance] = await db.insert(performances).values(data).returning();
  return newPerformance;
}

export async function getPerformances(startDate?: Date, endDate?: Date, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];

  let query = db.select().from(performances).$dynamic();

  if (startDate && endDate) {
    query = query.where(
      sql`performances.performance_date BETWEEN ${startDate} AND ${endDate}`
    );
  }

  return await query.orderBy(performances.performanceDate);
}

export async function getPerformanceById(id: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return undefined;
  const result = await db.select().from(performances).where(eq(performances.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePerformance(id: number, data: Partial<InsertPerformance>, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(performances).set(data).where(eq(performances.id, id));
}

export async function deletePerformance(id: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(performances).where(eq(performances.id, id));
}

export async function getArtistStats(artistId: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return { totalPerformances: 0, completedPerformances: 0, upcomingPerformances: 0 };

  const result = await db.select().from(performances).where(eq(performances.artistId, artistId));
  const now = new Date();

  return {
    totalPerformances: result.length,
    completedPerformances: result.filter((p: any) => p.status === 'completed').length,
    upcomingPerformances: result.filter((p: any) => p.performanceDate > now && p.status !== 'cancelled').length,
  };
}

export async function getWeeklyPerformances(dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return await db.select().from(performances)
    .where(sql`performances.performance_date BETWEEN ${now} AND ${weekEnd}`)
    .orderBy(performances.performanceDate);
}

export async function getMonthlyPerformances(year: number, month: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return await db.select().from(performances)
    .where(sql`performances.performance_date BETWEEN ${startDate} AND ${endDate}`)
    .orderBy(performances.performanceDate);
}

/**
 * Notice queries
 */
export async function createNotice(data: InsertNotice, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(notices).values(data);
}

export async function getNotices(dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];
  return await db.select().from(notices).orderBy(sql`notices.created_at DESC`);
}
