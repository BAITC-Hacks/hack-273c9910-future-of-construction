import { BUDGET } from "@/domain/constants";
import { INDICATOR_KEYS } from "@/domain/types";
import type {
  ActivatedSynergy,
  AppliedEffect,
  Decision,
  DistrictComparison,
  DistrictId,
  DistrictSnapshot,
  IndicatorDelta,
  Indicators,
  MeasureContribution,
  SimulationResult,
} from "@/domain/types";
import { DISTRICTS, DISTRICTS_BY_ID } from "@/data/districts";
import { MEASURES_BY_ID } from "@/data/measures";
import { SYNERGIES } from "@/data/synergies";
import { clip, realizedEffect, realizedFactor } from "./effects";
import {
  baselineScore,
  criticalIndicatorsOf,
  districtScore,
  rankedIndicators,
  scoreCity,
} from "./scoring";
import { totalCostOf, validateDecisions } from "./validator";

export class SimulationError extends Error {
  constructor(public readonly messages: string[]) {
    super(messages.join(" "));
    this.name = "SimulationError";
  }
}

function cloneIndicators(indicators: Indicators): Indicators {
  return { ...indicators };
}

function snapshotDistrict(
  id: DistrictId,
  indicators: Indicators,
): DistrictSnapshot {
  const district = DISTRICTS_BY_ID[id];
  return {
    id,
    name: district.name,
    nameRu: district.nameRu,
    populationShare: district.populationShare,
    profile: district.profile,
    indicators,
    score: districtScore(indicators),
    criticalIndicators: criticalIndicatorsOf(indicators),
    strongestIndicators: rankedIndicators(indicators, "strongest"),
    weakestIndicators: rankedIndicators(indicators, "weakest"),
  };
}

function emptyDeltas(): Record<DistrictId, Indicators> {
  const deltas = {} as Record<DistrictId, Indicators>;
  for (const district of DISTRICTS) {
    deltas[district.id] = {
      T1: 0,
      T2: 0,
      E1: 0,
      E2: 0,
      S1: 0,
      S2: 0,
      B1: 0,
      B2: 0,
      C1: 0,
      C2: 0,
    };
  }
  return deltas;
}

export function simulateDecisions(decisions: Decision[], budget: number = BUDGET): SimulationResult {
  const validation = validateDecisions(decisions, "final", budget);
  if (!validation.ok) {
    throw new SimulationError(validation.errors.map((error) => error.message));
  }

  return applyScenario(decisions, budget);
}

export function baselineDistricts(): DistrictSnapshot[] {
  return DISTRICTS.map((district) =>
    snapshotDistrict(district.id, cloneIndicators(district.indicators)),
  );
}

export function previewDecisions(decisions: Decision[], budget: number = BUDGET): SimulationResult {
  const validation = validateDecisions(decisions, "partial", budget);
  if (!validation.ok) {
    throw new SimulationError(validation.errors.map((error) => error.message));
  }

  return applyScenario(decisions, budget);
}

export type ScenarioSummary = {
  decisions: Decision[];
  totalCost: number;
  remainingBudget: number;
  finalScore: number;
  scoreDelta: number;
  cityAverage: number;
  weakestDistrictId: DistrictId;
  criticalCount: number;
  activatedSynergies: string[];
};

export function summarizeScenario(decisions: Decision[], budget: number = BUDGET): ScenarioSummary {
  const result = simulateDecisions(decisions, budget);
  return {
    decisions,
    totalCost: result.totalCost,
    remainingBudget: result.remainingBudget,
    finalScore: result.finalScore,
    scoreDelta: result.scoreDelta,
    cityAverage: result.cityAverage,
    weakestDistrictId: result.weakestDistrict.id,
    criticalCount: result.scoreAfter.criticalCount,
    activatedSynergies: result.activatedSynergies.map((item) => item.id),
  };
}

function applyScenario(decisions: Decision[], budget: number): SimulationResult {
  const deltas = emptyDeltas();
  const appliedEffects: AppliedEffect[] = [];
  const measureContributions: MeasureContribution[] = [];
  const activatedSynergies: ActivatedSynergy[] = [];

  for (const decision of decisions) {
    const measure = MEASURES_BY_ID[decision.measureId];
    const factor = realizedFactor(measure.lag);
    const contribution: MeasureContribution = {
      measureId: measure.id,
      scope: measure.scope,
      districtId: decision.scope === "district" ? decision.districtId : undefined,
      cost: measure.cost,
      lag: measure.lag,
      realizedFactor: factor,
      effects: [],
    };

    const targetDistricts =
      decision.scope === "city"
        ? DISTRICTS.map((district) => district.id)
        : [decision.districtId];

    for (const [indicator, fullEffect] of Object.entries(measure.effects)) {
      if (fullEffect === undefined) continue;
      const realized = realizedEffect(fullEffect, measure.lag);
      for (const districtId of targetDistricts) {
        deltas[districtId][indicator as keyof Indicators] += realized;
        appliedEffects.push({
          source: "measure",
          measureId: measure.id,
          districtId,
          indicator: indicator as keyof Indicators,
          fullEffect,
          realizedEffect: realized,
        });
        contribution.effects.push({
          districtId,
          indicator: indicator as keyof Indicators,
          realizedEffect: realized,
        });
      }
    }

    measureContributions.push(contribution);
  }

  const selected = new Set(decisions.map((decision) => decision.measureId));
  const districtOf = (measureId: (typeof decisions)[number]["measureId"]) => {
    const decision = decisions.find((item) => item.measureId === measureId);
    return decision?.scope === "district" ? decision.districtId : undefined;
  };

  for (const rule of SYNERGIES) {
    const [left, right] = rule.measureIds;
    if (!selected.has(left) || !selected.has(right)) continue;

    const districtId = districtOf(rule.anchorMeasureId);
    if (!districtId) continue;

    deltas[districtId][rule.indicator] += rule.bonus;
    appliedEffects.push({
      source: "synergy",
      synergyId: rule.id,
      districtId,
      indicator: rule.indicator,
      fullEffect: rule.bonus,
      realizedEffect: rule.bonus,
    });
    activatedSynergies.push({
      id: rule.id,
      measureIds: rule.measureIds,
      title: rule.title,
      description: rule.description,
      districtId,
      indicator: rule.indicator,
      bonus: rule.bonus,
    });
  }

  const afterIndicators = {} as Record<DistrictId, Indicators>;
  const comparisons: DistrictComparison[] = [];
  const districtsBefore: DistrictSnapshot[] = [];
  const districtsAfter: DistrictSnapshot[] = [];

  for (const district of DISTRICTS) {
    const before = cloneIndicators(district.indicators);
    const after = cloneIndicators(district.indicators);
    const delta = {} as IndicatorDelta;

    for (const key of INDICATOR_KEYS) {
      after[key] = clip(before[key] + deltas[district.id][key]);
      delta[key] = after[key] - before[key];
    }

    afterIndicators[district.id] = after;
    const beforeSnap = snapshotDistrict(district.id, before);
    const afterSnap = snapshotDistrict(district.id, after);
    districtsBefore.push(beforeSnap);
    districtsAfter.push(afterSnap);
    comparisons.push({
      id: district.id,
      name: district.name,
      nameRu: district.nameRu,
      before,
      after,
      delta,
      scoreBefore: beforeSnap.score,
      scoreAfter: afterSnap.score,
      scoreDelta: afterSnap.score - beforeSnap.score,
      criticalBefore: beforeSnap.criticalIndicators,
      criticalAfter: afterSnap.criticalIndicators,
    });
  }

  const scoreBefore = baselineScore();
  const scoreAfter = scoreCity(
    DISTRICTS.map((district) => ({
      ...district,
      indicators: afterIndicators[district.id],
    })),
  );

  const totalCost = totalCostOf(decisions);
  const weakest = DISTRICTS_BY_ID[scoreAfter.weakestDistrictId];

  return {
    decisions,
    districtsBefore,
    districtsAfter,
    comparisons,
    appliedEffects,
    measureContributions,
    activatedSynergies,
    totalCost,
    remainingBudget: budget - totalCost,
    scoreBefore,
    scoreAfter,
    finalScore: scoreAfter.finalScore,
    scoreDelta: scoreAfter.finalScore - scoreBefore.finalScore,
    cityAverage: scoreAfter.cityAverage,
    weakestDistrict: {
      id: weakest.id,
      name: weakest.nameRu,
      score: scoreAfter.weakestDistrictScore,
    },
    criticalIndicators: scoreAfter.criticalIndicators,
  };
}
