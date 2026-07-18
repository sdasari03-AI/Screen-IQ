import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const screeningRunsTable = pgTable("screening_runs", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull(),
  status: text("status").notNull().default("pending"),
  checksTotal: integer("checks_total").notNull().default(4),
  checksCompleted: integer("checks_completed").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScreeningRunSchema = createInsertSchema(screeningRunsTable).omit({ id: true, createdAt: true });
export type InsertScreeningRun = z.infer<typeof insertScreeningRunSchema>;
export type ScreeningRun = typeof screeningRunsTable.$inferSelect;
