import type { AiAnalysis, Decision, SimulationResult } from "@/domain/types";
import { describeDecision, buildLocalAnalysis } from "@/ai/localAnalyst";
import type { CityEvent } from "@/data/events";
import type { Advice } from "@/engine/advisor";
import { simulateDecisions } from "@/engine/simulation";
import { aiAnalysisSchema } from "./schemas";
import { toAnalyzeDto } from "./session";

export type SimulationSource = "server" | "browser";
export type AnalysisSource = "llm" | "local";

export type AnalysisOutcome = {
  source: AnalysisSource;
  analysis: AiAnalysis;
};

export async function runSimulation(
  decisions: Decision[],
): Promise<{ result: SimulationResult; source: SimulationSource }> {
  try {
    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions }),
    });
    if (response.ok) {
      const body = (await response.json()) as { ok: boolean; result?: SimulationResult };
      if (body.ok && body.result) return { result: body.result, source: "server" };
    }
  } catch {}
  return { result: simulateDecisions(decisions), source: "browser" };
}

export async function runAnalysis(context: {
  result: SimulationResult;
  advice: Advice;
  budget: number;
  event: CityEvent | null;
}): Promise<AnalysisOutcome> {
  const payload = {
    ...toAnalyzeDto(context.result),
    budget: context.budget,
    cityEvent: context.event
      ? {
          title: context.event.title,
          description: context.event.description,
          reserve: context.event.reserve,
        }
      : null,
    advisor: {
      startScore: context.advice.startScore,
      finalScore: context.advice.finalScore,
      steps: context.advice.steps.map((step) => ({
        remove: describeDecision(step.remove),
        add: describeDecision(step.add),
        scoreAfter: step.scoreAfter,
        gain: step.gain,
      })),
    },
  };

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const body = (await response.json()) as { ok: boolean; analysis?: unknown };
      const parsed = body.ok ? aiAnalysisSchema.safeParse(body.analysis) : null;
      if (parsed?.success) return { source: "llm", analysis: parsed.data };
    }
  } catch {}

  return { source: "local", analysis: buildLocalAnalysis(context) };
}
