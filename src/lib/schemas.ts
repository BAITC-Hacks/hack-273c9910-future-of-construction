import { z } from "zod";
import { DISTRICT_IDS, MEASURE_IDS } from "@/domain/types";

export const cityDecisionSchema = z.object({
  measureId: z.enum(MEASURE_IDS),
  scope: z.literal("city"),
});

export const districtDecisionSchema = z.object({
  measureId: z.enum(MEASURE_IDS),
  scope: z.literal("district"),
  districtId: z.enum(DISTRICT_IDS),
});

export const decisionSchema = z.discriminatedUnion("scope", [
  cityDecisionSchema,
  districtDecisionSchema,
]);

export const simulateRequestSchema = z.object({
  decisions: z.array(decisionSchema),
});

export const districtInsightSchema = z.object({
  districtId: z.enum(DISTRICT_IDS),
  text: z.string(),
});

export const aiAnalysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  tradeoffs: z.array(z.string()),
  recommendations: z.array(z.string()),
  districtInsights: z.array(districtInsightSchema),
  synergyExplanation: z.array(z.string()),
});

export const analyzeRequestSchema = z.object({
  finalScore: z.number(),
  scoreDelta: z.number(),
  cityAverage: z.number(),
  totalCost: z.number(),
  remainingBudget: z.number(),
  weakestDistrict: z.object({
    id: z.enum(DISTRICT_IDS),
    name: z.string(),
    score: z.number(),
  }),
  criticalIndicators: z.array(
    z.object({
      districtId: z.enum(DISTRICT_IDS),
      districtName: z.string(),
      indicator: z.string(),
      value: z.number(),
    }),
  ),
  activatedSynergies: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      districtId: z.enum(DISTRICT_IDS),
      indicator: z.string(),
      bonus: z.number(),
    }),
  ),
  comparisons: z.array(
    z.object({
      id: z.enum(DISTRICT_IDS),
      nameRu: z.string(),
      scoreBefore: z.number(),
      scoreAfter: z.number(),
      scoreDelta: z.number(),
      criticalBefore: z.array(z.string()),
      criticalAfter: z.array(z.string()),
    }),
  ),
  measureContributions: z.array(
    z.object({
      measureId: z.enum(MEASURE_IDS),
      scope: z.enum(["city", "district"]),
      districtId: z.enum(DISTRICT_IDS).optional(),
      cost: z.number(),
      effects: z.array(
        z.object({
          districtId: z.enum(DISTRICT_IDS),
          indicator: z.string(),
          realizedEffect: z.number(),
        }),
      ),
    }),
  ),
  scoreBefore: z.object({
    finalScore: z.number(),
    cityAverage: z.number(),
    criticalCount: z.number(),
  }),
  budget: z.number().optional(),
  cityEvent: z
    .object({
      title: z.string(),
      description: z.string(),
      reserve: z.number(),
    })
    .nullable()
    .optional(),
  advisor: z
    .object({
      startScore: z.number(),
      finalScore: z.number(),
      steps: z.array(
        z.object({
          remove: z.string(),
          add: z.string(),
          scoreAfter: z.number(),
          gain: z.number(),
        }),
      ),
    })
    .optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
