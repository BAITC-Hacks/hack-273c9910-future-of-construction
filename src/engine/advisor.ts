import { BUDGET } from "@/domain/constants";
import { DISTRICT_IDS } from "@/domain/types";
import type { Decision, Measure } from "@/domain/types";
import { MEASURES } from "@/data/measures";
import { scoreDecisionsFast } from "./fastScore";
import { validateDecisions } from "./validator";

export type AdviceStep = {
  remove: Decision;
  add: Decision;
  scoreBefore: number;
  scoreAfter: number;
  gain: number;
};

export type Advice = {
  startScore: number;
  finalScore: number;
  steps: AdviceStep[];
  decisions: Decision[];
  evaluatedScenarios: number;
};

const MIN_GAIN = 0.01;

function placements(measure: Measure): Decision[] {
  if (measure.scope === "city") {
    return [{ measureId: measure.id, scope: "city" }];
  }
  return DISTRICT_IDS.map((districtId) => ({
    measureId: measure.id,
    scope: "district" as const,
    districtId,
  }));
}

function sameDecision(a: Decision, b: Decision): boolean {
  if (a.measureId !== b.measureId || a.scope !== b.scope) return false;
  return a.scope === "city" || (b.scope === "district" && a.districtId === b.districtId);
}

/**
 * Greedy local search from the player's plan: each step applies the single
 * replacement (or relocation) that raises the score the most, within budget and rules.
 */
export function adviseImprovements(
  decisions: Decision[],
  options: { budget?: number; maxSteps?: number } = {},
): Advice {
  const budget = options.budget ?? BUDGET;
  const maxSteps = options.maxSteps ?? 3;
  const startScore = scoreDecisionsFast(decisions).finalScore;
  const steps: AdviceStep[] = [];
  let current = decisions;
  let currentScore = startScore;
  let evaluatedScenarios = 0;

  for (let step = 0; step < maxSteps; step += 1) {
    let best: { decisions: Decision[]; score: number; remove: Decision; add: Decision } | null = null;

    for (let index = 0; index < current.length; index += 1) {
      const removed = current[index];
      const rest = current.filter((_, position) => position !== index);
      const taken = new Set(rest.map((decision) => decision.measureId));

      for (const measure of MEASURES) {
        if (taken.has(measure.id)) continue;
        for (const candidate of placements(measure)) {
          if (sameDecision(candidate, removed)) continue;
          const next = [...rest, candidate];
          if (!validateDecisions(next, "final", budget).ok) continue;
          evaluatedScenarios += 1;
          const score = scoreDecisionsFast(next).finalScore;
          if (!best || score > best.score) {
            best = { decisions: next, score, remove: removed, add: candidate };
          }
        }
      }
    }

    if (!best || best.score - currentScore < MIN_GAIN) break;

    steps.push({
      remove: best.remove,
      add: best.add,
      scoreBefore: currentScore,
      scoreAfter: best.score,
      gain: best.score - currentScore,
    });
    current = best.decisions;
    currentScore = best.score;
  }

  return {
    startScore,
    finalScore: currentScore,
    steps,
    decisions: current,
    evaluatedScenarios,
  };
}
