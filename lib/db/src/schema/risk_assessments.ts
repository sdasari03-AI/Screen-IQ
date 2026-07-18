import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const riskAssessmentsTable = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  screeningRunId: integer("screening_run_id").notNull(),
  overallRisk: text("overall_risk").notNull(),
  keyFindings: text("key_findings").notNull(),
  recommendedSteps: text("recommended_steps").notNull(),
  fcraAdverseFlag: boolean("fcra_adverse_flag").notNull().default(false),
  riskFactors: jsonb("risk_factors").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRiskAssessmentSchema = createInsertSchema(riskAssessmentsTable).omit({ id: true, createdAt: true });
export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;
export type RiskAssessment = typeof riskAssessmentsTable.$inferSelect;
