import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const checkins = sqliteTable("checkins", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  checkinDate: text("checkin_date").notNull(),
  data: text("data").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  module: text("module").notNull(),
  docKey: text("doc_key").notNull(),
  data: text("data").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  module: text("module").notNull(),
  content: text("content").notNull(),
  itemDate: text("item_date"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  periodType: text("period_type").notNull(),
  periodKey: text("period_key").notNull(),
  data: text("data").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const patterns = sqliteTable("patterns", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  trigger: text("trigger"),
  reaction: text("reaction"),
  payoff: text("payoff"),
  cost: text("cost"),
  alternative: text("alternative"),
  evidence: text("evidence").notNull().default("[]"),
  status: text("status").notNull().default("watching"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
