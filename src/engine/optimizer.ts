import { BUDGET, MAX_MEASURES_PER_CATEGORY, REQUIRED_DECISIONS } from "@/domain/constants";
import { DISTRICT_IDS } from "@/domain/types";
import type {
  AlternativeScenario,
  Decision,
  DistrictId,
  Measure,
  MeasureId,
  OptimizeResult,
} from "@/domain/types";
import {
  GLOBAL_INCOMPATIBILITIES,
  SAME_DISTRICT_INCOMPATIBILITIES,
} from "@/data/incompatibilities";
import { MEASURES } from "@/data/measures";
import { remainingBudget, scoreDecisionsFast } from "./fastScore";
import { baselineScore } from "./scoring";

const TOP_POOL = 24;
const RESULT_LIMIT = 4;

function combinations<T>(items: T[], k: number): T[][] {
  const result: T[][] = [];
  const acc: T[] = [];

  function rec(start: number): void {
    if (acc.length === k) {
      result.push([...acc]);
      return;
    }
    const need = k - acc.length;
    for (let i = start; i <= items.length - need; i += 1) {
      acc.push(items[i]);
      rec(i + 1);
      acc.pop();
    }
  }

  rec(0);
  return result;
}

function comboFeasible(combo: Measure[], budget: number): boolean {
  const ids = new Set(combo.map((measure) => measure.id));

  for (const rule of GLOBAL_INCOMPATIBILITIES) {
    if (ids.has(rule.measureIds[0]) && ids.has(rule.measureIds[1])) {
      return false;
    }
  }

  const categoryCounts = new Map<string, number>();
  let cost = 0;
  for (const measure of combo) {
    cost += measure.cost;
    categoryCounts.set(
      measure.category,
      (categoryCounts.get(measure.category) ?? 0) + 1,
    );
  }

  if (cost > budget) return false;

  for (const count of categoryCounts.values()) {
    if (count > MAX_MEASURES_PER_CATEGORY) return false;
  }

  return true;
}

function assignmentConflicts(
  districtMeasures: Measure[],
  assignment: DistrictId[],
): boolean {
  const byId: Partial<Record<MeasureId, DistrictId>> = {};
  districtMeasures.forEach((measure, index) => {
    byId[measure.id] = assignment[index];
  });

  for (const rule of SAME_DISTRICT_INCOMPATIBILITIES) {
    const left = byId[rule.measureIds[0]];
    const right = byId[rule.measureIds[1]];
    if (left && right && left === right) return true;
  }

  return false;
}

function buildDecisions(
  combo: Measure[],
  assignment: DistrictId[],
): Decision[] {
  const decisions: Decision[] = [];
  let districtIndex = 0;

  for (const measure of combo) {
    if (measure.scope === "city") {
      decisions.push({ measureId: measure.id, scope: "city" });
    } else {
      decisions.push({
        measureId: measure.id,
        scope: "district",
        districtId: assignment[districtIndex],
      });
      districtIndex += 1;
    }
  }

  return decisions;
}

function measureSignature(decisions: Decision[]): string {
  return decisions
    .map((decision) => decision.measureId)
    .sort()
    .join(",");
}

function keepTop(pool: AlternativeScenario[], candidate: AlternativeScenario): void {
  if (pool.length < TOP_POOL) {
    pool.push(candidate);
    pool.sort((a, b) => b.finalScore - a.finalScore);
    return;
  }

  const worst = pool[pool.length - 1];
  if (candidate.finalScore <= worst.finalScore) return;

  pool[pool.length - 1] = candidate;
  pool.sort((a, b) => b.finalScore - a.finalScore);
}

function diversify(pool: AlternativeScenario[]): AlternativeScenario[] {
  const selected: AlternativeScenario[] = [];
  const used = new Set<string>();

  for (const scenario of pool) {
    const key = measureSignature(scenario.decisions);
    if (used.has(key)) continue;
    selected.push(scenario);
    used.add(key);
    if (selected.length >= RESULT_LIMIT) break;
  }

  if (selected.length < RESULT_LIMIT) {
    for (const scenario of pool) {
      if (selected.includes(scenario)) continue;
      selected.push(scenario);
      if (selected.length >= RESULT_LIMIT) break;
    }
  }

  return selected;
}

export function optimizeScenarios(budget: number = BUDGET): OptimizeResult {
  if (!Number.isFinite(budget) || budget < 0) {
    throw new Error("Budget must be a finite nonnegative number.");
  }

  const combos = combinations(MEASURES, REQUIRED_DECISIONS);
  const pool: AlternativeScenario[] = [];
  const baseline = baselineScore().finalScore;
  let searchedCombinations = 0;
  let evaluatedScenarios = 0;

  for (const combo of combos) {
    searchedCombinations += 1;
    if (!comboFeasible(combo, budget)) continue;

    const districtMeasures = combo.filter((measure) => measure.scope === "district");
    const districtCount = districtMeasures.length;
    const assignmentTotal = DISTRICT_IDS.length ** districtCount;

    for (let index = 0; index < assignmentTotal; index += 1) {
      const assignment: DistrictId[] = [];
      let cursor = index;
      for (let slot = 0; slot < districtCount; slot += 1) {
        assignment.push(DISTRICT_IDS[cursor % DISTRICT_IDS.length]);
        cursor = Math.floor(cursor / DISTRICT_IDS.length);
      }

      if (assignmentConflicts(districtMeasures, assignment)) continue;

      const decisions = buildDecisions(combo, assignment);
      const scored = scoreDecisionsFast(decisions);
      evaluatedScenarios += 1;
      keepTop(pool, {
        decisions,
        totalCost: scored.totalCost,
        remainingBudget: remainingBudget(scored.totalCost, budget),
        finalScore: scored.finalScore,
        scoreDelta: scored.finalScore - baseline,
        cityAverage: scored.cityAverage,
        weakestDistrictId: scored.weakestDistrictId,
        criticalCount: scored.criticalCount,
        activatedSynergies: scored.activatedSynergyIds,
      });
    }
  }

  const ranked = diversify(pool);
  const bestScenario = ranked[0];

  if (!bestScenario) {
    throw new Error("Optimizer did not find any feasible scenario.");
  }

  return {
    bestScenario,
    score: bestScenario.finalScore,
    delta: bestScenario.scoreDelta,
    alternatives: ranked.slice(1),
    searchedCombinations,
    evaluatedScenarios,
  };
}
