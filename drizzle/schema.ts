import { int, mysqlEnum, mysqlTable, primaryKey, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "writer", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body").notNull(),
  coverImageUrl: text("coverImageUrl"),
  category: varchar("category", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["draft", "published", "unpublished"]).default("draft").notNull(),
  authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp("publishedAt"),
});

export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 32 }).notNull(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const postTags = mysqlTable("postTags", {
  postId: int("postId").notNull().references(() => posts.id, { onDelete: "cascade" }),
  tagId: int("tagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.postId, table.tagId] })]);

export const writerApplications = mysqlTable("writerApplications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  motivation: text("motivation").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
}, (table) => [uniqueIndex("writerApplication_user_unique").on(table.userId)]);

export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: int("authorId").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["visible", "hidden"]).default("visible").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const postVotes = mysqlTable("postVotes", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  value: int("value").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("postVote_user_unique").on(table.postId, table.userId)]);
