import { z } from "zod";
import { CITY_EVENT_IDS } from "@/data/events";
import { REQUIRED_DECISIONS } from "@/domain/constants";
import { DISTRICT_IDS, MEASURE_IDS } from "@/domain/types";

export const cityDecisionSchema = z.object({
  measureId: z.enum(MEASURE_IDS),
  scope: z.literal("city"),
}).strict();

export const districtDecisionSchema = z.object({
  measureId: z.enum(MEASURE_IDS),
  scope: z.literal("district"),
  districtId: z.enum(DISTRICT_IDS),
}).strict();

export const decisionSchema = z.discriminatedUnion("scope", [
  cityDecisionSchema,
  districtDecisionSchema,
]);

export const simulateRequestSchema = z.object({
  decisions: z.array(decisionSchema).max(REQUIRED_DECISIONS),
  eventId: z.enum(CITY_EVENT_IDS).nullable().optional(),
}).strict();

export const optimizeRequestSchema = z.object({
  eventId: z.enum(CITY_EVENT_IDS).nullable().optional(),
}).strict();

export const districtInsightSchema = z.object({
  districtId: z.enum(DISTRICT_IDS),
  text: z.string().min(1).max(2000),
});

export const aiAnalysisSchema = z.object({
  summary: z.string().min(1).max(3000),
  strengths: z.array(z.string().min(1).max(2000)).max(15),
  risks: z.array(z.string().min(1).max(2000)).max(15),
  tradeoffs: z.array(z.string().min(1).max(2000)).max(15),
  recommendations: z.array(z.string().min(1).max(2000)).max(15),
  districtInsights: z.array(districtInsightSchema).length(DISTRICT_IDS.length)
    .refine((items) => new Set(items.map((item) => item.districtId)).size === DISTRICT_IDS.length),
  synergyExplanation: z.array(z.string().min(1).max(2000)).max(15),
}).strict();

export const analyzeRequestSchema = simulateRequestSchema;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
