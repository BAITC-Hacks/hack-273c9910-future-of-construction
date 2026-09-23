import { describe, expect, it } from "vitest";
import type { Decision } from "@/domain/types";
import { buildLocalAnalysis } from "@/ai/localAnalyst";
import { CITY_EVENTS, pickCityEvent } from "@/data/events";
import { adviseImprovements } from "@/engine/advisor";
import { scoreDecisionsFast } from "@/engine/fastScore";
import { simulateDecisions } from "@/engine/simulation";
import { totalCostOf, validateDecisions } from "@/engine/validator";
import { aiAnalysisSchema } from "@/lib/schemas";
import { CONTROL_SCENARIO } from "./fixtures";

const WEAK_SCENARIO: Decision[] = [
  { measureId: "M2", scope: "city" },
  { measureId: "M6", scope: "city" },
  { measureId: "M14", scope: "city" },
  { measureId: "M9", scope: "district", districtId: "esil" },
  { measureId: "M11", scope: "district", districtId: "esil" },
];

describe("advisor", () => {
  it("improves a weak plan with valid, strictly better steps", () => {
    const advice = adviseImprovements(WEAK_SCENARIO);

    expect(advice.steps.length).toBeGreaterThan(0);
    expect(advice.finalScore).toBeGreaterThan(advice.startScore);
    expect(validateDecisions(advice.decisions, "final").ok).toBe(true);
    expect(scoreDecisionsFast(advice.decisions).finalScore).toBeCloseTo(advice.finalScore, 10);
    for (const step of advice.steps) {
      expect(step.gain).toBeGreaterThan(0);
    }
  });

  it("respects a reduced budget", () => {
    const advice = adviseImprovements(WEAK_SCENARIO, { budget: 80 });
    expect(totalCostOf(advice.decisions)).toBeLessThanOrEqual(80);
  });

  it("is deterministic", () => {
    expect(adviseImprovements(CONTROL_SCENARIO)).toEqual(adviseImprovements(CONTROL_SCENARIO));
  });
});

describe("local analyst", () => {
  it("returns schema-valid analysis grounded in engine numbers", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    const advice = adviseImprovements(CONTROL_SCENARIO);
    const analysis = buildLocalAnalysis({ result, advice, budget: 100 });

    expect(aiAnalysisSchema.safeParse(analysis).success).toBe(true);
    expect(analysis.summary).toContain(result.finalScore.toFixed(2));
    expect(analysis.districtInsights).toHaveLength(5);
    expect(analysis.strengths.length).toBeGreaterThan(0);
    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });

  it("flags unfunded directions as a risk", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    const analysis = buildLocalAnalysis({ result, advice: adviseImprovements(CONTROL_SCENARIO), budget: 100 });
    expect(analysis.risks.some((risk) => risk.includes("Без финансирования") && risk.includes("Транспорт"))).toBe(
      true,
    );
  });
});

describe("city events", () => {
  it("picks the same event for the same decisions regardless of order", () => {
    const first = pickCityEvent(CONTROL_SCENARIO.slice(0, 3));
    const second = pickCityEvent([...CONTROL_SCENARIO.slice(0, 3)].reverse());
    expect(first).toBe(second);
    expect(CITY_EVENTS).toContain(first);
  });

  it("enforces the reduced budget in validation", () => {
    const cost = totalCostOf(CONTROL_SCENARIO);
    expect(validateDecisions(CONTROL_SCENARIO, "final", cost).ok).toBe(true);
    expect(validateDecisions(CONTROL_SCENARIO, "final", cost - 1).ok).toBe(false);
  });
});
