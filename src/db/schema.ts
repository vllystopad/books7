import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  authors: jsonb("authors").notNull().default(sql`'[]'::jsonb`),
  description: text("description"),
  coverUrl: varchar("cover_url", { length: 512 }),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  year: integer("year"),
  source: varchar("source", { length: 50 }).notNull(),
  license: varchar("license", { length: 100 }),
  tokensTotal: integer("tokens_total").notNull().default(0),
  chaptersCount: integer("chapters_count").notNull().default(0),
  trustScore: numeric("trust_score", { precision: 3, scale: 1 })
    .notNull()
    .default("5.0"),
  // AI-provenance. NULL for non-synthetic books; the `synthetic_must_be_marked`
  // CHECK constraint stops a synthetic row existing without generatedBy and
  // syntheticNotice. See migration 002.
  generatedBy: text("generated_by"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  syntheticNotice: text("synthetic_notice"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  order: integer("order").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  chapterId: integer("chapter_id"),
  order: integer("order").notNull(),
  content: text("content").notNull(),
  tokens: integer("tokens").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookTopics = pgTable("book_topics", {
  bookId: integer("book_id").notNull(),
  topicId: integer("topic_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;
export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = typeof chapters.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type InsertChunk = typeof chunks.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;
