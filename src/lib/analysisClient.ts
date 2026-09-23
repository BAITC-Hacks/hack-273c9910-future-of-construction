import type { AiAnalysis, Decision, OptimizeResult, SimulationResult } from "@/domain/types";
import { buildLocalAnalysis } from "@/ai/localAnalyst";
import { getScenarioBudget, type CityEvent } from "@/data/events";
import type { Advice } from "@/engine/advisor";
import { simulateDecisions } from "@/engine/simulation";
import { aiAnalysisSchema } from "./schemas";

export type SimulationSource = "server" | "browser";
export type AnalysisSource = "llm" | "local";

export type AnalysisOutcome = {
  source: AnalysisSource;
  analysis: AiAnalysis;
};

class RejectedScenario extends Error {}

export async function runSimulation(
  decisions: Decision[],
  eventId: string | null = null,
): Promise<{ result: SimulationResult; source: SimulationSource }> {
  try {
    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions, eventId }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      const body = (await response.json()) as { ok: boolean; result?: SimulationResult };
      if (body.ok && body.result) return { result: body.result, source: "server" };
    } else if (response.status >= 400 && response.status < 500) {
      const body = await response.json();
      throw new RejectedScenario(body.errors?.[0]?.message ?? "Сценарий отклонён сервером.");
    }
  } catch (error) { if (error instanceof RejectedScenario) throw error; }
  return { result: simulateDecisions(decisions, getScenarioBudget(eventId)), source: "browser" };
}

export async function runOptimization(eventId: string | null = null): Promise<OptimizeResult | null> {
  try {
    const response = await fetch("/api/optimize", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }), signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json();
    return response.ok && body.ok ? body.result : null;
  } catch { return null; }
}

export async function runAnalysis(context: {
  result: SimulationResult;
  advice: Advice;
  budget: number;
  event: CityEvent | null;
}): Promise<AnalysisOutcome> {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions: context.result.decisions, eventId: context.event?.id ?? null }),
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) {
      const body = (await response.json()) as { ok: boolean; source?: string; analysis?: unknown };
      const parsed = body.ok ? aiAnalysisSchema.safeParse(body.analysis) : null;
      if (parsed?.success) return { source: body.source === "llm" ? "llm" : "local", analysis: parsed.data };
    }
  } catch { /* The deterministic explanation remains available offline. */ }

  return { source: "local", analysis: buildLocalAnalysis(context) };
}
