import { describe, expect, it } from "vitest";
import { optimizeScenarios } from "@/engine/optimizer";
import { validateDecisions } from "@/engine/validator";
import { simulateDecisions } from "@/engine/simulation";
import { getScenarioBudget } from "@/data/events";
import { remainingBudget, scoreDecisionsFast } from "@/engine/fastScore";
import { CONTROL_SCENARIO } from "./fixtures";

describe("optimizer", () => {
  it("returns valid high-scoring alternatives without using an LLM", () => {
    const result = optimizeScenarios();
    expect(result.bestScenario.decisions).toHaveLength(5);
    expect(validateDecisions(result.bestScenario.decisions).ok).toBe(true);

    const simulated = simulateDecisions(result.bestScenario.decisions);
    expect(simulated.finalScore).toBeCloseTo(result.score, 8);

    const control = simulateDecisions(CONTROL_SCENARIO);
    expect(result.score).toBeGreaterThanOrEqual(control.finalScore - 1e-9);
    expect(result.alternatives.length).toBeGreaterThan(0);
  }, 30000);

  it("optimizes within the reduced event budget with matching full scores", () => {
    const budget = getScenarioBudget("spring_flood");
    const result = optimizeScenarios(budget);
    for (const scenario of [result.bestScenario, ...result.alternatives]) {
      expect(scenario.totalCost).toBeLessThanOrEqual(budget);
      expect(validateDecisions(scenario.decisions, "final", budget).ok).toBe(true);
      const simulated = simulateDecisions(scenario.decisions, budget);
      const fast = scoreDecisionsFast(scenario.decisions);
      expect(simulated.finalScore).toBeCloseTo(scenario.finalScore, 10);
      expect(fast.finalScore).toBeCloseTo(scenario.finalScore, 10);
      expect(scenario.remainingBudget).toBe(budget - scenario.totalCost);
      expect(simulated.remainingBudget).toBe(scenario.remainingBudget);
      expect(remainingBudget(scenario.totalCost, budget)).toBe(scenario.remainingBudget);
    }
  }, 30000);

  it("finds a plan at the minimum feasible budget and refuses a smaller one", () => {
    const result = optimizeScenarios(61);
    expect(result.bestScenario.totalCost).toBe(61);
    expect(result.bestScenario.remainingBudget).toBe(0);
    expect(() => optimizeScenarios(60)).toThrow("did not find");
  }, 30000);
});
