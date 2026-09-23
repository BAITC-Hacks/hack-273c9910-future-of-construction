import {
  CRITICAL_THRESHOLD,
  INDICATOR_WEIGHTS,
  SCORE_CITY_AVERAGE_WEIGHT,
  SCORE_WEAKEST_DISTRICT_WEIGHT,
} from "@/domain/constants";
import type {
  CriticalIndicator,
  District,
  DistrictId,
  IndicatorKey,
  Indicators,
  ScoreBreakdown,
} from "@/domain/types";
import { INDICATOR_KEYS } from "@/domain/types";
import { DISTRICTS } from "@/data/districts";

export function districtScore(indicators: Indicators): number {
  let total = 0;
  for (const key of INDICATOR_KEYS) {
    total += INDICATOR_WEIGHTS[key] * indicators[key];
  }
  return total;
}

export function criticalIndicatorsOf(indicators: Indicators): IndicatorKey[] {
  return INDICATOR_KEYS.filter(
    (key) => indicators[key] < CRITICAL_THRESHOLD,
  );
}

export function rankedIndicators(
  indicators: Indicators,
  direction: "strongest" | "weakest",
  count = 3,
): IndicatorKey[] {
  const sorted = [...INDICATOR_KEYS].sort((a, b) =>
    direction === "strongest"
      ? indicators[b] - indicators[a]
      : indicators[a] - indicators[b],
  );
  return sorted.slice(0, count);
}

export function scoreCity(
  districts: Array<Pick<District, "id" | "name" | "nameRu" | "populationShare" | "indicators">>,
): ScoreBreakdown {
  const districtScores = {} as Record<DistrictId, number>;
  const criticalIndicators: CriticalIndicator[] = [];

  for (const district of districts) {
    const score = districtScore(district.indicators);
    districtScores[district.id] = score;

    for (const key of INDICATOR_KEYS) {
      const value = district.indicators[key];
      if (value < CRITICAL_THRESHOLD) {
        criticalIndicators.push({
          districtId: district.id,
          districtName: district.nameRu,
          indicator: key,
          value,
        });
      }
    }
  }

  const cityAverage = districts.reduce(
    (sum, district) => sum + district.populationShare * districtScores[district.id],
    0,
  );

  let weakestDistrictId = districts[0].id;
  let weakestDistrictScore = districtScores[weakestDistrictId];
  for (const district of districts) {
    const score = districtScores[district.id];
    if (score < weakestDistrictScore) {
      weakestDistrictId = district.id;
      weakestDistrictScore = score;
    }
  }

  const finalScore =
    SCORE_CITY_AVERAGE_WEIGHT * cityAverage +
    SCORE_WEAKEST_DISTRICT_WEIGHT * weakestDistrictScore -
    criticalIndicators.length;

  return {
    districtScores,
    cityAverage,
    weakestDistrictId,
    weakestDistrictScore,
    criticalCount: criticalIndicators.length,
    criticalIndicators,
    finalScore,
  };
}

export function baselineScore(): ScoreBreakdown {
  return scoreCity(DISTRICTS);
}
