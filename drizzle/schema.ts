import { boolean, integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Artist table - 아티스트 정보 관리
 */
export const artists = pgTable("artists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  genre: varchar("genre", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  instagram: varchar("instagram", { length: 255 }),
  grade: varchar("grade", { length: 50 }),
  availableTime: varchar("available_time", { length: 255 }),
  preferredDays: varchar("preferred_days", { length: 255 }),
  instruments: varchar("instruments", { length: 255 }),
  memberCount: integer("member_count").default(1).notNull(),
  notes: text("notes"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  realName: varchar("real_name", { length: 100 }),
  residentNumber: varchar("resident_number", { length: 20 }),
  bankAccount: varchar("bank_account", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Artist = typeof artists.$inferSelect;
export type InsertArtist = typeof artists.$inferInsert;

/**
 * Performance table - 공연 일정 관리
 */
export const performanceStatusEnum = pgEnum("performance_status", ["pending", "scheduled", "confirmed", "completed", "cancelled"]);

export const performances = pgTable("performances", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  artistId: integer("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  performanceDate: timestamp("performance_date").notNull(),
  status: performanceStatusEnum("status").default("scheduled").notNull(),
  notes: text("notes"),
  // 정산: null이면 아티스트 기본 인원수 / 기본 인원수당 설정값을 사용
  actualMemberCount: integer("actual_member_count"),
  perPersonRate: integer("per_person_rate"),
  extraTip: integer("extra_tip").default(0).notNull(),
  // 1부/2부 공연 횟수. null이면 요일 기준 자동 (금·토·일 = 2부)
  setCount: integer("set_count"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Performance = typeof performances.$inferSelect;
export type InsertPerformance = typeof performances.$inferInsert;

/**
 * Notice table - 공지 메시지 관리
 */
export const notices = pgTable("notices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notice = typeof notices.$inferSelect;
export type InsertNotice = typeof notices.$inferInsert;

/**
 * Settings table - 앱 전역 설정 (메시지 템플릿 등)
 */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;