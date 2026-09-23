import { BUDGET, CRITICAL_THRESHOLD, INDICATOR_WEIGHTS } from "@/domain/constants";
import { DISTRICT_IDS, INDICATOR_KEYS } from "@/domain/types";
import type { Decision, DistrictId, IndicatorKey } from "@/domain/types";
import { DISTRICTS } from "@/data/districts";
import { MEASURES_BY_ID } from "@/data/measures";
import { SYNERGIES } from "@/data/synergies";
import { clip, realizedEffect } from "./effects";
import {
  SCORE_CITY_AVERAGE_WEIGHT,
  SCORE_WEAKEST_DISTRICT_WEIGHT,
} from "@/domain/constants";

const INDICATOR_INDEX = Object.fromEntries(
  INDICATOR_KEYS.map((key, index) => [key, index]),
) as Record<IndicatorKey, number>;

const BASE = DISTRICTS.map((district) =>
  INDICATOR_KEYS.map((key) => district.indicators[key]),
);
const POP = DISTRICTS.map((district) => district.populationShare);
const WEIGHTS = INDICATOR_KEYS.map((key) => INDICATOR_WEIGHTS[key]);

export type FastScore = {
  finalScore: number;
  cityAverage: number;
  weakestDistrictId: DistrictId;
  weakestDistrictScore: number;
  criticalCount: number;
  activatedSynergyIds: string[];
  totalCost: number;
};

export function scoreDecisionsFast(decisions: Decision[]): FastScore {
  const values = BASE.map((row) => row.slice());
  const selected = new Set(decisions.map((decision) => decision.measureId));
  const districtOf = new Map<string, DistrictId>();
  let totalCost = 0;

  for (const decision of decisions) {
    const measure = MEASURES_BY_ID[decision.measureId];
    totalCost += measure.cost;
    const targets =
      decision.scope === "city"
        ? DISTRICT_IDS
        : [decision.districtId];
    if (decision.scope === "district") {
      districtOf.set(decision.measureId, decision.districtId);
    }

    for (const [indicator, fullEffect] of Object.entries(measure.effects)) {
      if (fullEffect === undefined) continue;
      const realized = realizedEffect(fullEffect, measure.lag);
      const column = INDICATOR_INDEX[indicator as IndicatorKey];
      for (const districtId of targets) {
        const row = DISTRICT_IDS.indexOf(districtId);
        values[row][column] += realized;
      }
    }
  }

  const activatedSynergyIds: string[] = [];
  for (const rule of SYNERGIES) {
    if (!selected.has(rule.measureIds[0]) || !selected.has(rule.measureIds[1])) {
      continue;
    }
    const districtId = districtOf.get(rule.anchorMeasureId);
    if (!districtId) continue;
    const row = DISTRICT_IDS.indexOf(districtId);
    values[row][INDICATOR_INDEX[rule.indicator]] += rule.bonus;
    activatedSynergyIds.push(rule.id);
  }

  const districtScores: number[] = [];
  let criticalCount = 0;

  for (let d = 0; d < values.length; d += 1) {
    let score = 0;
    for (let i = 0; i < INDICATOR_KEYS.length; i += 1) {
      const clipped = clip(values[d][i]);
      values[d][i] = clipped;
      score += WEIGHTS[i] * clipped;
      if (clipped < CRITICAL_THRESHOLD) criticalCount += 1;
    }
    districtScores.push(score);
  }

  let cityAverage = 0;
  let weakestIndex = 0;
  for (let d = 0; d < districtScores.length; d += 1) {
    cityAverage += POP[d] * districtScores[d];
    if (districtScores[d] < districtScores[weakestIndex]) {
      weakestIndex = d;
    }
  }

  const weakestDistrictScore = districtScores[weakestIndex];
  const finalScore =
    SCORE_CITY_AVERAGE_WEIGHT * cityAverage +
    SCORE_WEAKEST_DISTRICT_WEIGHT * weakestDistrictScore -
    criticalCount;

  return {
    finalScore,
    cityAverage,
    weakestDistrictId: DISTRICT_IDS[weakestIndex],
    weakestDistrictScore,
    criticalCount,
    activatedSynergyIds,
    totalCost,
  };
}

export function remainingBudget(totalCost: number, budget: number = BUDGET): number {
  return budget - totalCost;
}
