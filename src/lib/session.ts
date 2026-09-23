import type { Decision, SimulationResult } from "@/domain/types";

export const DECISIONS_KEY = "akim-decisions";
export const RESULT_KEY = "akim-result";

export function loadDecisions(): Decision[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(DECISIONS_KEY);
    return raw ? (JSON.parse(raw) as Decision[]) : [];
  } catch {
    return [];
  }
}

export function saveDecisions(decisions: Decision[]): void {
  sessionStorage.setItem(DECISIONS_KEY, JSON.stringify(decisions));
}

export function loadResult(): SimulationResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    return raw ? (JSON.parse(raw) as SimulationResult) : null;
  } catch {
    return null;
  }
}

export function saveResult(result: SimulationResult): void {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export const EVENT_MODE_KEY = "akim-event-mode";
export const EVENT_KEY = "akim-event";

export function loadSessionValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveSessionValue(key: string, value: unknown): void {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function clearSession(): void {
  sessionStorage.removeItem(DECISIONS_KEY);
  sessionStorage.removeItem(RESULT_KEY);
  sessionStorage.removeItem(EVENT_KEY);
}

export function toAnalyzeDto(result: SimulationResult) {
  return {
    finalScore: result.finalScore,
    scoreDelta: result.scoreDelta,
    cityAverage: result.cityAverage,
    totalCost: result.totalCost,
    remainingBudget: result.remainingBudget,
    weakestDistrict: result.weakestDistrict,
    criticalIndicators: result.criticalIndicators,
    activatedSynergies: result.activatedSynergies.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      districtId: item.districtId,
      indicator: item.indicator,
      bonus: item.bonus,
    })),
    comparisons: result.comparisons.map((item) => ({
      id: item.id,
      nameRu: item.nameRu,
      scoreBefore: item.scoreBefore,
      scoreAfter: item.scoreAfter,
      scoreDelta: item.scoreDelta,
      criticalBefore: item.criticalBefore,
      criticalAfter: item.criticalAfter,
    })),
    measureContributions: result.measureContributions.map((item) => ({
      measureId: item.measureId,
      scope: item.scope,
      districtId: item.districtId,
      cost: item.cost,
      effects: item.effects,
    })),
    scoreBefore: {
      finalScore: result.scoreBefore.finalScore,
      cityAverage: result.scoreBefore.cityAverage,
      criticalCount: result.scoreBefore.criticalCount,
    },
  };
}
