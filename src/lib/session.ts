import type { Decision, SimulationResult } from "@/domain/types";
import { getScenarioBudget } from "@/data/events";
import { simulateDecisions } from "@/engine/simulation";
import { simulateRequestSchema } from "./schemas";

export const DECISIONS_KEY = "akim-decisions";
export const RESULT_KEY = "akim-result";
export const BUDGET_KEY = "akim-budget";
export const ADMIN_MEASURES_KEY = "akim-admin-measures";

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
  saveSessionValue(DECISIONS_KEY, decisions);
}

export function loadResult(): SimulationResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    const parsed = simulateRequestSchema.safeParse({ decisions: stored?.decisions, eventId: stored?.eventId ?? null });
    return parsed.success ? simulateDecisions(parsed.data.decisions, getScenarioBudget(parsed.data.eventId)) : null;
  } catch {
    return null;
  }
}

export function saveResult(result: SimulationResult, eventId: string | null = null): void {
  saveSessionValue(RESULT_KEY, { ...result, eventId });
}

export function loadResultEventId(): string | null {
  const stored = loadSessionValue<{ eventId?: string } | null>(RESULT_KEY, null);
  return stored?.eventId ?? null;
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
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* The current game remains usable when storage is disabled. */ }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(DECISIONS_KEY);
    sessionStorage.removeItem(RESULT_KEY);
    sessionStorage.removeItem(EVENT_KEY);
  } catch { /* The caller resets in-memory state. */ }
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
      before: item.before,
      after: item.after,
      delta: item.delta,
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
      lag: item.lag,
      realizedFactor: item.realizedFactor,
      effects: item.effects,
    })),
    scoreBefore: {
      finalScore: result.scoreBefore.finalScore,
      cityAverage: result.scoreBefore.cityAverage,
      criticalCount: result.scoreBefore.criticalCount,
    },
  };
}
