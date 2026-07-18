import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adverseActionsTable = pgTable("adverse_actions", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull(),
  screeningRunId: integer("screening_run_id").notNull(),
  stage: text("stage").notNull().default("pre_adverse"),
  reason: text("reason"),
  preAdverseNoticeSentAt: timestamp("pre_adverse_notice_sent_at", { withTimezone: true }),
  waitingPeriodEndsAt: timestamp("waiting_period_ends_at", { withTimezone: true }),
  finalNoticeAt: timestamp("final_notice_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adverseActionNoticesTable = pgTable("adverse_action_notices", {
  id: serial("id").primaryKey(),
  adverseActionId: integer("adverse_action_id").notNull(),
  noticeType: text("notice_type").notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdverseActionSchema = createInsertSchema(adverseActionsTable).omit({ id: true, createdAt: true });
export type InsertAdverseAction = z.infer<typeof insertAdverseActionSchema>;
export type AdverseAction = typeof adverseActionsTable.$inferSelect;
