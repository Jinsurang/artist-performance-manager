import { eq, sql, and, gte, lte, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, artists, performances, notices, InsertArtist, InsertPerformance, InsertNotice, settings } from "../drizzle/schema";
import { ENV } from './_core/env';

// Safe access to process.env (may not exist in Cloudflare Workers)
const safeProcessEnv = typeof process !== 'undefined' ? process.env : {};

// Global singleton for the database connection
let _db: ReturnType<typeof drizzle> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

export async function getDb(databaseUrl?: string) {
  const url = databaseUrl || safeProcessEnv.DATABASE_URL;
  if (!url) return null;

  if (!_sql) {
    try {
      _sql = postgres(url, {
        ssl: 'require',
        max_prepared: 0,
        connect_timeout: 10,
        // Render (Node.js) can handle multiple connections better than Cloudflare
        max: 10,
        idle_timeout: 30,
      } as any);
      _db = drizzle(_sql);
    } catch (error) {
      console.error("[Database] Connection failed:", error);
      _sql = null;
      _db = null;
    }
  }
  return _db;
}

export async function getRawSql() {
  if (!_sql) await getDb();
  return _sql;
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
export async function createArtist(data: any, dbInstance?: any) {
  const sqlClient = await getRawSql();
  if (!sqlClient) throw new Error("데이터베이스 연결 실패");

  // V3.0: Standard SQL insert for Node.js (Render)
  const result = await sqlClient`
    INSERT INTO artists (name, genre, phone, instagram, grade, available_time, preferred_days, instruments, member_count, notes)
    VALUES (
      ${data.name || ""}, 
      ${data.genre || ""}, 
      ${data.phone || null}, 
      ${data.instagram || null}, 
      ${data.grade || null}, 
      ${data.availableTime || null}, 
      ${data.preferredDays || null}, 
      ${data.instruments || null}, 
      ${data.memberCount || 1},
      ${data.notes || null}
    )
    RETURNING *
  `;

  if (!result[0]) return null;
  const row = result[0];

  // Return camelCase to match Drizzle/Frontend expectations
  return {
    id: row.id,
    name: row.name,
    genre: row.genre,
    phone: row.phone,
    instagram: row.instagram,
    grade: row.grade,
    availableTime: row.available_time,
    preferredDays: row.preferred_days,
    instruments: row.instruments,
    memberCount: row.member_count,
    notes: row.notes,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
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

  return await query.orderBy(artists.name);
}

export async function searchPublicArtists(name: string, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];

  return await db.select({
    id: artists.id,
    name: artists.name,
    instruments: artists.instruments,
    memberCount: artists.memberCount,
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

export async function deleteOtherDailyPendings(performanceId: number, performanceDate: Date, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");

  const start = new Date(performanceDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(performanceDate);
  end.setHours(23, 59, 59, 999);

  return await db.delete(performances).where(
    and(
      ne(performances.id, performanceId),
      eq(performances.status, 'pending'),
      gte(performances.performanceDate, start),
      lte(performances.performanceDate, end)
    )
  );
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

  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return await db.select({
    id: performances.id,
    artistId: performances.artistId,
    title: performances.title,
    performanceDate: performances.performanceDate,
    status: performances.status,
    notes: performances.notes,
    createdAt: performances.createdAt,
    updatedAt: performances.updatedAt,
    artistName: artists.name,
    artistGenre: artists.genre,
    artistPhone: artists.phone,
    artistInstagram: artists.instagram,
    artistMemberCount: artists.memberCount,
  })
    .from(performances)
    .leftJoin(artists, eq(performances.artistId, artists.id))
    .where(and(
      gte(performances.performanceDate, startDate),
      lte(performances.performanceDate, endDate)
    ))
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

export async function updateNotice(id: number, data: Partial<InsertNotice>, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(notices).set(data).where(eq(notices.id, id));
}

export async function deleteNotice(id: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(notices).where(eq(notices.id, id));
}

/**
 * Settings queries
 */
export async function getSetting(key: string, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return undefined;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0].value : undefined;
}

export async function updateSetting(key: string, value: string, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");

  // Upsert pattern
  return await db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() }
    });
}
