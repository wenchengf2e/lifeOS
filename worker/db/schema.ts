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

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  domain: text("domain").notNull().default("other"),
  status: text("status").notNull().default("active"),
  data: text("data").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const fears = sqliteTable("fears", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  data: text("data").notNull().default("{}"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const energySessions = sqliteTable("energy_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tool: text("tool").notNull(),
  data: text("data").notNull().default("{}"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const telosProfiles = sqliteTable("telos_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  mission: text("mission").notNull().default(""),
  currentState: text("current_state").notNull().default(""),
  idealState: text("ideal_state").notNull().default(""),
  version: integer("version").notNull().default(1),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const telosItems = sqliteTable("telos_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  parentId: text("parent_id"),
  category: text("category").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  data: text("data").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const telosSnapshots = sqliteTable("telos_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemCount: integer("item_count").notNull().default(0),
  data: text("data").notNull(),
  createdAt: text("created_at").notNull(),
});

export const coachProfiles = sqliteTable("coach_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  data: text("data").notNull().default("{}"),
  version: integer("version").notNull().default(1),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  mode: text("mode").notNull().default("reactive"),
  skill: text("skill"),
  stage: text("stage").notNull().default("listen"),
  title: text("title").notNull().default(""),
  summary: text("summary").notNull().default(""),
  triggerRef: text("trigger_ref_json").notNull().default("{}"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  seq: integer("seq").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  skill: text("skill"),
  stage: text("stage"),
  quickReplies: text("quick_replies_json").notNull().default("[]"),
  proposals: text("proposals_json").notNull().default("[]"),
  refs: text("refs_json").notNull().default("[]"),
  contextSnapshot: text("context_snapshot_json").notNull().default("{}"),
  model: text("model"),
  tokenUsage: integer("token_usage"),
  createdAt: text("created_at").notNull(),
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
