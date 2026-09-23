import { describe, expect, it } from "vitest";
import { EXPECTED_CONTROL_SCORE } from "@/domain/constants";
import { getScenarioBudget } from "@/data/events";
import type { Decision } from "@/domain/types";
import { scoreDecisionsFast } from "@/engine/fastScore";
import { previewDecisions, simulateDecisions, summarizeScenario } from "@/engine/simulation";
import { baselineScore } from "@/engine/scoring";
import { CONTROL_SCENARIO } from "./fixtures";

describe("simulation engine", () => {
  it("uses cost 95 for the control scenario", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    expect(result.totalCost).toBe(95);
    expect(result.remainingBudget).toBe(5);
  });

  it("activates only the M10+M12 synergy on Nura B1", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    expect(result.activatedSynergies).toHaveLength(1);
    expect(result.activatedSynergies[0]).toMatchObject({
      id: "M10_M12",
      districtId: "nura",
      indicator: "B1",
      bonus: 2,
    });
  });

  it("applies lag-scaled realized effects and an unscaled synergy bonus", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    const nura = result.comparisons.find((item) => item.id === "nura");
    expect(nura).toBeTruthy();
    if (!nura) return;

    expect(nura.after.S1).toBeCloseTo(48, 10);
    expect(nura.after.S2).toBeCloseTo(43.75, 10);
    expect(nura.after.B1).toBeCloseTo(67.5, 10);
    expect(nura.after.B2).toBeCloseTo(51.75, 10);
    expect(nura.after.C2).toBeCloseTo(54.375, 10);

    const saryarka = result.comparisons.find((item) => item.id === "saryarka");
    expect(saryarka?.after.E2).toBeCloseTo(48.75, 10);
    expect(saryarka?.after.C1).toBeCloseTo(47.5, 10);
  });

  it("clears Nura critical indicators in the control scenario", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    expect(result.scoreAfter.criticalCount).toBe(0);
    expect(result.criticalIndicators).toEqual([]);
  });

  it("computes a literal-formula control score near 56.5 without fitting", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    expect(result.finalScore).toBeCloseTo(EXPECTED_CONTROL_SCORE, 0);
    expect(result.scoreDelta).toBeCloseTo(
      result.finalScore - baselineScore().finalScore,
      10,
    );
  });

  it("keeps the fast scorer identical to the full simulation", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    const fast = scoreDecisionsFast(CONTROL_SCENARIO);
    expect(fast.finalScore).toBeCloseTo(result.finalScore, 10);
    expect(fast.cityAverage).toBeCloseTo(result.cityAverage, 10);
    expect(fast.criticalCount).toBe(result.scoreAfter.criticalCount);
    expect(fast.activatedSynergyIds).toEqual(
      result.activatedSynergies.map((item) => item.id),
    );
  });

  it("does not calculate an official score for an invalid set", () => {
    expect(() =>
      simulateDecisions([
        { measureId: "M1", scope: "district", districtId: "esil" },
        { measureId: "M3", scope: "district", districtId: "nura" },
        { measureId: "M9", scope: "district", districtId: "almaty" },
        { measureId: "M10", scope: "district", districtId: "baikonyr" },
        { measureId: "M12", scope: "city" },
      ]),
    ).toThrow();
  });

  it("is order-invariant", () => {
    const reversed = [...CONTROL_SCENARIO].reverse();
    const a = simulateDecisions(CONTROL_SCENARIO);
    const b = simulateDecisions(reversed);
    expect(a.finalScore).toBeCloseTo(b.finalScore, 10);
    expect(a.cityAverage).toBeCloseTo(b.cityAverage, 10);
  });

  it("uses the event budget for final validation and the remaining balance", () => {
    const decisions: Decision[] = [
      { measureId: "M7", scope: "district", districtId: "nura" },
      { measureId: "M8", scope: "district", districtId: "nura" },
      { measureId: "M10", scope: "district", districtId: "nura" },
      { measureId: "M12", scope: "city" },
      { measureId: "M6", scope: "city" },
    ];
    const budget = getScenarioBudget("spring_flood");
    const result = simulateDecisions(decisions, budget);
    expect(result.totalCost).toBe(90);
    expect(result.remainingBudget).toBe(0);
    expect(() => simulateDecisions(decisions, budget - 1)).toThrow();
    expect(result.finalScore).toBeCloseTo(scoreDecisionsFast(decisions).finalScore, 10);
    expect(result.finalScore).toBeCloseTo(simulateDecisions(decisions).finalScore, 10);
    expect(() => simulateDecisions(CONTROL_SCENARIO, budget)).toThrow();
  });

  it("applies the same budget to partial previews and summaries", () => {
    const preview = previewDecisions(CONTROL_SCENARIO.slice(0, 2), 90);
    expect(preview.totalCost).toBe(44);
    expect(preview.remainingBudget).toBe(46);
    expect(() => previewDecisions(CONTROL_SCENARIO.slice(0, 2), 43)).toThrow();
    expect(() => summarizeScenario(CONTROL_SCENARIO, 90)).toThrow();
    expect(summarizeScenario(CONTROL_SCENARIO, 95).remainingBudget).toBe(0);
  });
});
