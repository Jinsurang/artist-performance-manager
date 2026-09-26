import { eq, sql, and, gte, lte, ne, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, artists, performances, notices, InsertArtist, InsertPerformance, InsertNotice, settings, performanceTips, portalLoginAttempts } from "../drizzle/schema";
import { ENV } from './_core/env';

// Safe access to process.env (may not exist in Cloudflare Workers)
const safeProcessEnv = typeof process !== 'undefined' ? process.env : {};

// Global singleton for the database connection
let _db: ReturnType<typeof drizzle> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;
let _schemaReady: Promise<void> | null = null;

// 이 프로젝트는 drizzle 마이그레이션 파이프라인 없이 배포되므로, 추가된 컬럼은 첫 연결 시 멱등하게 보장한다.
function ensureSchema(sqlClient: ReturnType<typeof postgres>) {
  if (!_schemaReady) {
    _schemaReady = (async () => {
      await sqlClient`ALTER TABLE artists ADD COLUMN IF NOT EXISTS real_name VARCHAR(100)`;
      await sqlClient`ALTER TABLE artists ADD COLUMN IF NOT EXISTS resident_number VARCHAR(20)`;
      await sqlClient`ALTER TABLE artists ADD COLUMN IF NOT EXISTS bank_account VARCHAR(255)`;
      await sqlClient`ALTER TABLE performances ADD COLUMN IF NOT EXISTS actual_member_count INTEGER`;
      await sqlClient`ALTER TABLE performances ADD COLUMN IF NOT EXISTS per_person_rate INTEGER`;
      await sqlClient`ALTER TABLE performances ADD COLUMN IF NOT EXISTS extra_tip INTEGER DEFAULT 0 NOT NULL`;
      await sqlClient`ALTER TABLE performances ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`;
      await sqlClient`ALTER TABLE performances ADD COLUMN IF NOT EXISTS set_count INTEGER`;
      await sqlClient`CREATE TABLE IF NOT EXISTS performance_tips (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        performance_id INTEGER NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
        tipped_at TIMESTAMP NOT NULL,
        amount INTEGER NOT NULL,
        depositor VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`;
      await sqlClient`CREATE INDEX IF NOT EXISTS performance_tips_performance_id_idx ON performance_tips(performance_id)`;
      await sqlClient`ALTER TABLE performance_tips ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE`;
      await sqlClient`CREATE TABLE IF NOT EXISTS portal_login_attempts (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name_key VARCHAR(100) NOT NULL,
        success BOOLEAN NOT NULL DEFAULT FALSE,
        attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`;
      await sqlClient`CREATE INDEX IF NOT EXISTS portal_login_attempts_name_key_idx ON portal_login_attempts(name_key, attempted_at)`;
    })().catch(error => {
      console.error("[Database] Schema ensure failed:", error);
      _schemaReady = null;
    });
  }
  return _schemaReady;
}

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
  if (_sql) await ensureSchema(_sql);
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
    INSERT INTO artists (name, genre, phone, instagram, grade, available_time, preferred_days, instruments, member_count, notes, real_name, resident_number, bank_account)
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
      ${data.notes || null},
      ${data.realName || null},
      ${data.residentNumber || null},
      ${data.bankAccount || null}
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
    realName: row.real_name,
    residentNumber: row.resident_number,
    bankAccount: row.bank_account,
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

  // Expand range by 1 day on each side to catch timezone offsets (e.g. KST +9)
  const startDate = new Date(year, month - 1, 0, 0, 0, 0); // Last day of prev month
  const endDate = new Date(year, month, 1, 23, 59, 59);    // 1st day of next month

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
    artistInstruments: artists.instruments,
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
 * Settlement queries - 월별 정산 (실제 공연한 건만)
 */
export const SETTLEMENT_STATUSES = ["confirmed", "scheduled", "completed"] as const;

export async function getMonthlySettlement(year: number, month: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];

  const startDate = new Date(year, month - 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 1, 23, 59, 59);

  return await db.select({
    id: performances.id,
    artistId: performances.artistId,
    title: performances.title,
    performanceDate: performances.performanceDate,
    status: performances.status,
    actualMemberCount: performances.actualMemberCount,
    perPersonRate: performances.perPersonRate,
    extraTip: performances.extraTip,
    setCount: performances.setCount,
    paidAt: performances.paidAt,
    artistName: artists.name,
    artistMemberCount: artists.memberCount,
    artistRealName: artists.realName,
    artistResidentNumber: artists.residentNumber,
    artistBankAccount: artists.bankAccount,
  })
    .from(performances)
    .leftJoin(artists, eq(performances.artistId, artists.id))
    .where(and(
      gte(performances.performanceDate, startDate),
      lte(performances.performanceDate, endDate),
      inArray(performances.status, [...SETTLEMENT_STATUSES])
    ))
    .orderBy(performances.performanceDate);
}

export async function updateSettlement(
  id: number,
  data: { actualMemberCount?: number | null; perPersonRate?: number | null; extraTip?: number; setCount?: number | null },
  dbInstance?: any
) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  const { extraTip, ...rest } = data;
  // 합계를 직접 고치면 붙여넣은 내역은 그대로 두고 차액만 "직접 입력" 항목으로 보존한다
  if (extraTip !== undefined) {
    await setManualTipTotal(id, extraTip, db);
  }
  if (Object.keys(rest).length === 0) return;
  return await db.update(performances).set({ ...rest, updatedAt: new Date() }).where(eq(performances.id, id));
}

export type TipInput = { tippedAt: Date; amount: number; depositor?: string | null };

const tipColumns = {
  id: performanceTips.id,
  performanceId: performanceTips.performanceId,
  tippedAt: performanceTips.tippedAt,
  amount: performanceTips.amount,
  depositor: performanceTips.depositor,
  isManual: performanceTips.isManual,
};

const tipKey = (t: { tippedAt: Date | string; amount: number; depositor?: string | null }) =>
  `${new Date(t.tippedAt).getTime()}|${t.amount}|${(t.depositor || "").trim()}`;

async function recomputeExtraTip(performanceId: number, db: any) {
  const [row] = await db.select({ total: sql<number>`coalesce(sum(${performanceTips.amount}), 0)` })
    .from(performanceTips)
    .where(eq(performanceTips.performanceId, performanceId));
  await db.update(performances)
    .set({ extraTip: Number(row?.total ?? 0), updatedAt: new Date() })
    .where(eq(performances.id, performanceId));
}

// 붙여넣은 내역 중 이미 있는 것(같은 시각·금액·송금자)은 건너뛰고 새 것만 추가한다
export async function mergePerformanceTips(performanceId: number, tips: TipInput[], dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select(tipColumns).from(performanceTips).where(eq(performanceTips.performanceId, performanceId));
  const seen = new Set(existing.map(tipKey));
  const fresh = tips.filter(t => {
    const key = tipKey(t);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (fresh.length > 0) {
    await db.insert(performanceTips).values(
      fresh.map(t => ({ performanceId, tippedAt: t.tippedAt, amount: t.amount, depositor: t.depositor?.trim() || null, isManual: false }))
    );
  }
  await recomputeExtraTip(performanceId, db);
  return { added: fresh.length, skipped: tips.length - fresh.length };
}

export async function setManualTipTotal(performanceId: number, total: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  const perf = await getPerformanceById(performanceId, db);
  if (!perf) throw new Error("Performance not found");
  const [row] = await db.select({ total: sql<number>`coalesce(sum(${performanceTips.amount}), 0)` })
    .from(performanceTips)
    .where(and(eq(performanceTips.performanceId, performanceId), eq(performanceTips.isManual, false)));
  const pastedSum = Number(row?.total ?? 0);
  await db.delete(performanceTips).where(and(eq(performanceTips.performanceId, performanceId), eq(performanceTips.isManual, true)));
  const adjustment = total - pastedSum;
  if (adjustment !== 0) {
    await db.insert(performanceTips).values({
      performanceId,
      tippedAt: perf.performanceDate,
      amount: adjustment,
      depositor: null,
      isManual: true,
    });
  }
  await recomputeExtraTip(performanceId, db);
}

export async function deletePerformanceTip(tipId: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  const [tip] = await db.select(tipColumns).from(performanceTips).where(eq(performanceTips.id, tipId)).limit(1);
  if (!tip) return;
  await db.delete(performanceTips).where(eq(performanceTips.id, tipId));
  await recomputeExtraTip(tip.performanceId, db);
}

export async function getTipsForMonth(year: number, month: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];
  const startDate = new Date(year, month - 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 1, 23, 59, 59);
  return await db.select(tipColumns)
    .from(performanceTips)
    .innerJoin(performances, eq(performanceTips.performanceId, performances.id))
    .where(and(
      gte(performances.performanceDate, startDate),
      lte(performances.performanceDate, endDate)
    ))
    .orderBy(performanceTips.tippedAt);
}

export async function getTipsForPerformanceIds(ids: number[], dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db || ids.length === 0) return [];
  return await db.select(tipColumns)
    .from(performanceTips)
    .where(inArray(performanceTips.performanceId, ids))
    .orderBy(performanceTips.tippedAt);
}

/**
 * Artist portal - 아티스트 본인 정산 조회 (담당자 실명 + 연락처 뒷 4자리)
 */
export async function findArtistsForPortal(realName: string, phoneLast4: string, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return [];
  const nameKey = realName.trim().toLowerCase();
  return await db.select({ id: artists.id, name: artists.name, realName: artists.realName })
    .from(artists)
    .where(sql`lower(trim(coalesce(${artists.realName}, ''))) = ${nameKey}
      AND right(regexp_replace(coalesce(${artists.phone}, ''), '\\D', '', 'g'), 4) = ${phoneLast4}`)
    .orderBy(artists.name);
}

export async function countRecentPortalFailures(nameKey: string, windowMinutes: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(portalLoginAttempts)
    .where(and(
      eq(portalLoginAttempts.nameKey, nameKey),
      eq(portalLoginAttempts.success, false),
      gte(portalLoginAttempts.attemptedAt, since)
    ));
  return Number(result[0]?.count ?? 0);
}

export async function recordPortalAttempt(nameKey: string, success: boolean, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) return;
  await db.insert(portalLoginAttempts).values({ nameKey, success });
}

export async function getPortalSettlement(artistIds: number[], year: number, month: number, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db || artistIds.length === 0) return [];
  const startDate = new Date(year, month - 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 1, 23, 59, 59);
  return await db.select({
    id: performances.id,
    artistId: performances.artistId,
    artistName: artists.name,
    artistMemberCount: artists.memberCount,
    performanceDate: performances.performanceDate,
    actualMemberCount: performances.actualMemberCount,
    perPersonRate: performances.perPersonRate,
    extraTip: performances.extraTip,
    setCount: performances.setCount,
    paidAt: performances.paidAt,
  })
    .from(performances)
    .leftJoin(artists, eq(performances.artistId, artists.id))
    .where(and(
      inArray(performances.artistId, artistIds),
      gte(performances.performanceDate, startDate),
      lte(performances.performanceDate, endDate),
      inArray(performances.status, [...SETTLEMENT_STATUSES])
    ))
    .orderBy(performances.performanceDate);
}

export async function setSettlementPaid(ids: number[], paid: boolean, dbInstance?: any) {
  const db = dbInstance || await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  return await db.update(performances)
    .set({ paidAt: paid ? new Date() : null, updatedAt: new Date() })
    .where(inArray(performances.id, ids));
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
