import { describe, expect, it } from "vitest";
import { optimizeScenarios } from "@/engine/optimizer";
import { validateDecisions } from "@/engine/validator";
import { simulateDecisions } from "@/engine/simulation";
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
});
