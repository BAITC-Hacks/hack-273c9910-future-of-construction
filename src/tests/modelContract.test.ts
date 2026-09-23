import { describe, expect, it, vi } from "vitest";
import {
  BUDGET,
  CRITICAL_THRESHOLD,
  INDICATOR_WEIGHTS,
  MAX_MEASURES_PER_CATEGORY,
  REQUIRED_DECISIONS,
  SCORE_CITY_AVERAGE_WEIGHT,
  SCORE_WEAKEST_DISTRICT_WEIGHT,
  SIMULATION_HORIZON,
} from "@/domain/constants";
import type { Decision, District, Indicators, Measure } from "@/domain/types";
import { DISTRICTS } from "@/data/districts";
import { MEASURES } from "@/data/measures";
import { SYNERGIES } from "@/data/synergies";
import { scoreDecisionsFast } from "@/engine/fastScore";
import { baselineScore, criticalIndicatorsOf, scoreCity } from "@/engine/scoring";
import { simulateDecisions } from "@/engine/simulation";
import { validateDecisions } from "@/engine/validator";

// These literals are transcribed from the supplied hackathon specification.
// Do not derive expected values from production constants or shared fixtures:
// this contract must detect an accidental edit to the underlying dataset.
const SPEC_DISTRICTS: Array<Pick<District, "id" | "populationShare" | "indicators">> = [
  { id: "esil", populationShare: 0.27, indicators: { T1: 45, T2: 62, E1: 68, E2: 72, S1: 48, S2: 55, B1: 78, B2: 60, C1: 75, C2: 70 } },
  { id: "almaty", populationShare: 0.24, indicators: { T1: 40, T2: 75, E1: 50, E2: 55, S1: 60, S2: 65, B1: 62, B2: 52, C1: 50, C2: 60 } },
  { id: "saryarka", populationShare: 0.20, indicators: { T1: 50, T2: 70, E1: 42, E2: 40, S1: 62, S2: 68, B1: 58, B2: 55, C1: 45, C2: 55 } },
  { id: "baikonyr", populationShare: 0.13, indicators: { T1: 52, T2: 68, E1: 55, E2: 50, S1: 58, S2: 60, B1: 52, B2: 58, C1: 55, C2: 58 } },
  { id: "nura", populationShare: 0.16, indicators: { T1: 55, T2: 40, E1: 45, E2: 65, S1: 38, S2: 35, B1: 55, B2: 50, C1: 60, C2: 50 } },
];

const SPEC_MEASURES: Array<Omit<Measure, "name">> = [
  { id: "M1", category: "transport", scope: "district", cost: 18, lag: 2, effects: { T1: 6, T2: 9 } },
  { id: "M2", category: "transport", scope: "city", cost: 22, lag: 2, effects: { T1: 4, B2: 3 } },
  { id: "M3", category: "transport", scope: "district", cost: 30, lag: 4, effects: { T1: 16, T2: 20, E2: 4 } },
  { id: "M4", category: "ecology", scope: "district", cost: 15, lag: 2, effects: { E1: 12, E2: 3, B1: 2 } },
  { id: "M5", category: "ecology", scope: "district", cost: 25, lag: 3, effects: { E2: 14, C1: 4 } },
  { id: "M6", category: "ecology", scope: "city", cost: 20, lag: 4, effects: { E1: 5, E2: 3 } },
  { id: "M7", category: "social", scope: "district", cost: 24, lag: 3, effects: { S1: 16 } },
  { id: "M8", category: "social", scope: "district", cost: 20, lag: 3, effects: { S2: 14 } },
  { id: "M9", category: "social", scope: "district", cost: 10, lag: 1, effects: { S1: 3, S2: 3, B1: 3 } },
  { id: "M10", category: "safety", scope: "district", cost: 12, lag: 1, effects: { B1: 12, B2: 2 } },
  { id: "M11", category: "safety", scope: "district", cost: 10, lag: 1, effects: { B2: 12, T1: -2 } },
  { id: "M12", category: "services", scope: "city", cost: 14, lag: 1, effects: { C2: 5 } },
  { id: "M13", category: "services", scope: "district", cost: 28, lag: 4, effects: { C1: 18, E2: 2 } },
  { id: "M14", category: "services", scope: "city", cost: 16, lag: 1, effects: { C1: 5, C2: 2 } },
];

const SPEC_CONTROL: Decision[] = [
  { measureId: "M7", scope: "district", districtId: "nura" },
  { measureId: "M8", scope: "district", districtId: "nura" },
  { measureId: "M10", scope: "district", districtId: "nura" },
  { measureId: "M12", scope: "city" },
  { measureId: "M5", scope: "district", districtId: "saryarka" },
];

function permutations<T>(items: T[]): T[][] {
  if (items.length === 0) return [[]];
  return items.flatMap((item, index) =>
    permutations(items.filter((_, other) => other !== index)).map((rest) => [item, ...rest]),
  );
}

function expectExactScore(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(1e-8);
}

describe("published model contract", () => {
  it("preserves all 50 district indicators and five population shares", () => {
    expect(DISTRICTS.map(({ id, populationShare, indicators }) => ({ id, populationShare, indicators })))
      .toEqual(SPEC_DISTRICTS);
    expectExactScore(DISTRICTS.reduce((sum, district) => sum + district.populationShare, 0), 1);
  });

  it("preserves the price, lag, scope, category and every effect of all 14 measures", () => {
    expect(MEASURES.map(({ id, category, scope, cost, lag, effects }) => ({ id, category, scope, cost, lag, effects })))
      .toEqual(SPEC_MEASURES);
  });

  it("preserves the published constraints and indicator weights", () => {
    expect({ BUDGET, REQUIRED_DECISIONS, MAX_MEASURES_PER_CATEGORY, SIMULATION_HORIZON, CRITICAL_THRESHOLD })
      .toEqual({ BUDGET: 100, REQUIRED_DECISIONS: 5, MAX_MEASURES_PER_CATEGORY: 2, SIMULATION_HORIZON: 8, CRITICAL_THRESHOLD: 40 });
    expect(INDICATOR_WEIGHTS).toEqual({ T1: 0.10, T2: 0.10, E1: 0.09, E2: 0.11, S1: 0.11, S2: 0.11, B1: 0.09, B2: 0.09, C1: 0.10, C2: 0.10 });
    expect(SCORE_CITY_AVERAGE_WEIGHT).toBe(0.7);
    expect(SCORE_WEAKEST_DISTRICT_WEIGHT).toBe(0.3);
  });

  it("preserves all three synergy pairs, targets and unscaled bonuses", () => {
    expect(SYNERGIES.map(({ measureIds, anchorMeasureId, indicator, bonus }) => ({ measureIds, anchorMeasureId, indicator, bonus })))
      .toEqual([
        { measureIds: ["M1", "M2"], anchorMeasureId: "M1", indicator: "T1", bonus: 2 },
        { measureIds: ["M10", "M12"], anchorMeasureId: "M10", indicator: "B1", bonus: 2 },
        { measureIds: ["M5", "M6"], anchorMeasureId: "M5", indicator: "E2", bonus: 2 },
      ]);
  });

  it("matches the unrounded baseline and control calculation to 1e-8", () => {
    const baseline = baselineScore();
    expectExactScore(baseline.finalScore, 52.55768);
    expectExactScore(baseline.cityAverage, 56.8624);
    expect(baseline.districtScores).toEqual(expect.objectContaining({
      esil: expect.closeTo(62.99, 8), almaty: expect.closeTo(57.06, 8),
      saryarka: expect.closeTo(54.65, 8), baikonyr: expect.closeTo(56.63, 8), nura: expect.closeTo(49.18, 8),
    }));
    const result = simulateDecisions(SPEC_CONTROL);
    expectExactScore(result.finalScore, 56.54307);
    expectExactScore(result.scoreDelta, 3.98539);
    expectExactScore(result.cityAverage, 58.0776);
    expectExactScore(result.weakestDistrict.score, 52.9625);
    expect(result.weakestDistrict.id).toBe("nura");
    expect(result.totalCost).toBe(95);
    expect(result.remainingBudget).toBe(5);
    expect(baseline.criticalCount).toBe(2);
    expect(result.scoreAfter.criticalCount).toBe(0);
    expect(result.activatedSynergies).toHaveLength(1);
    expect(result.activatedSynergies[0]).toMatchObject({ id: "M10_M12", districtId: "nura", indicator: "B1", bonus: 2 });
  });

  it("produces the same district values and exact score for all 120 control permutations in both scorers", () => {
    const expected = simulateDecisions(SPEC_CONTROL);
    const orders = permutations(SPEC_CONTROL);
    expect(orders).toHaveLength(120);
    for (const decisions of orders) {
      const full = simulateDecisions(decisions);
      const fast = scoreDecisionsFast(decisions);
      expectExactScore(full.finalScore, 56.54307);
      expectExactScore(fast.finalScore, 56.54307);
      expectExactScore(fast.cityAverage, 58.0776);
      expect(full.comparisons).toEqual(expected.comparisons);
      expect(full.totalCost).toBe(95);
      expect(fast.totalCost).toBe(95);
      expect(fast.criticalCount).toBe(0);
      expect(fast.activatedSynergyIds).toEqual(["M10_M12"]);
    }
  });

  it("counts 39.99 as critical and 40 as non-critical with exactly one point of penalty", () => {
    const indicators: Indicators = { T1: 40, T2: 50, E1: 50, E2: 50, S1: 50, S2: 50, B1: 50, B2: 50, C1: 50, C2: 50 };
    const district = { id: "nura" as const, name: "Nura", nameRu: "Нура", populationShare: 1, indicators };
    const atThreshold = scoreCity([district]);
    const below = { ...indicators, T1: 39.99 };
    const belowThreshold = scoreCity([{ ...district, indicators: below }]);
    expect(criticalIndicatorsOf(indicators)).toEqual([]);
    expect(criticalIndicatorsOf(below)).toEqual(["T1"]);
    expect(atThreshold.criticalCount).toBe(0);
    expect(belowThreshold.criticalCount).toBe(1);
    expectExactScore(atThreshold.finalScore, 49);
    expectExactScore(belowThreshold.finalScore, 47.999);
    expectExactScore(atThreshold.finalScore - belowThreshold.finalScore, 1.001);
  });

  it("accepts the published cheapest five-measure set costing 61 and leaves 39", () => {
    const decisions: Decision[] = [
      { measureId: "M9", scope: "district", districtId: "nura" },
      { measureId: "M11", scope: "district", districtId: "nura" },
      { measureId: "M10", scope: "district", districtId: "nura" },
      { measureId: "M12", scope: "city" },
      { measureId: "M4", scope: "district", districtId: "esil" },
    ];
    expect(validateDecisions(decisions, "final")).toEqual({ ok: true });
    const result = simulateDecisions(decisions);
    expect(result.totalCost).toBe(61);
    expect(result.remainingBudget).toBe(39);
    expect(Number.isFinite(result.finalScore)).toBe(true);
    expectExactScore(result.finalScore, scoreDecisionsFast(decisions).finalScore);
  });

  it.each([
    { initial: 99, expected: 100 },
    { initial: 1, expected: 8.75 },
  ])("accumulates positive and negative effects before clamping when T1 starts at $initial", async ({ initial, expected }) => {
    // A cloned boundary dataset lets the real engines exercise saturation without
    // editing or mutating the shared source dataset used by the other contracts.
    const original = structuredClone(DISTRICTS);
    const boundaryDistricts = DISTRICTS.map((district) => ({
      ...district,
      indicators: { ...district.indicators, ...(district.id === "esil" ? { T1: initial, B2: 99 } : {}) },
    }));
    vi.resetModules();
    vi.doMock("@/data/districts", () => ({
      DISTRICTS: boundaryDistricts,
      DISTRICTS_BY_ID: Object.fromEntries(boundaryDistricts.map((district) => [district.id, district])),
    }));
    try {
      const { simulateDecisions: boundarySimulation } = await import("@/engine/simulation");
      const { scoreDecisionsFast: boundaryFast } = await import("@/engine/fastScore");
      const decisions: Decision[] = [
        { measureId: "M1", scope: "district", districtId: "esil" },
        { measureId: "M2", scope: "city" },
        { measureId: "M11", scope: "district", districtId: "esil" },
        { measureId: "M12", scope: "city" },
        { measureId: "M14", scope: "city" },
      ];
      for (const order of permutations(decisions)) {
        const full = boundarySimulation(order);
        const esil = full.districtsAfter.find((district) => district.id === "esil");
        expect(esil?.indicators.T1).toBe(expected);
        expect(esil?.indicators.B2).toBe(100);
        expectExactScore(boundaryFast(order).finalScore, full.finalScore);
      }
    } finally {
      vi.doUnmock("@/data/districts");
      vi.resetModules();
    }
    expect(DISTRICTS).toEqual(original);
  });
});
