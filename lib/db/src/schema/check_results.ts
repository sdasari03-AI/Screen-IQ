import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const checkResultsTable = pgTable("check_results", {
  id: serial("id").primaryKey(),
  screeningRunId: integer("screening_run_id").notNull(),
  checkType: text("check_type").notNull(),
  status: text("status").notNull(),
  statusLabel: text("status_label").notNull(),
  dataSource: text("data_source").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }).notNull(),
  processingTimeMs: integer("processing_time_ms").notNull(),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCheckResultSchema = createInsertSchema(checkResultsTable).omit({ id: true, createdAt: true });
export type InsertCheckResult = z.infer<typeof insertCheckResultSchema>;
export type CheckResult = typeof checkResultsTable.$inferSelect;
