import { NextResponse } from "next/server";
import { analyzeSimulation } from "@/ai/analyst";
import { buildLocalAnalysis, describeDecision } from "@/ai/localAnalyst";
import { CITY_EVENTS, getScenarioBudget } from "@/data/events";
import { adviseImprovements } from "@/engine/advisor";
import { simulateDecisions, SimulationError } from "@/engine/simulation";
import { simulateRequestSchema } from "@/lib/schemas";
import { toAnalyzeDto } from "@/lib/session";
import { readScenarioBody, ScenarioRequestError } from "@/lib/scenario-http";

export const runtime = "nodejs";
let runningAnalyses = 0;
const analysisCache = new Map<string, { expires: number; analysis: unknown }>();
const requestTimes: number[] = [];

export async function POST(request: Request) {
  try {
    const parsed = simulateRequestSchema.safeParse(await readScenarioBody(request));
    if (!parsed.success) return NextResponse.json({ ok: false, message: "Некорректный сценарий для анализа." }, { status: 400 });
    // Never accept a client-supplied Score, dataset, or system prompt.
    const { decisions, eventId } = parsed.data;
    const cacheKey = JSON.stringify({ eventId: eventId ?? null, decisions: [...decisions].sort((a, b) => a.measureId.localeCompare(b.measureId)) });
    const budget = getScenarioBudget(eventId);
    const event = CITY_EVENTS.find((item) => item.id === eventId) ?? null;
    const result = simulateDecisions(decisions, budget);
    const now = Date.now();
    for (const [key, entry] of analysisCache) if (entry.expires <= now) analysisCache.delete(key);
    const cached = analysisCache.get(cacheKey);
    if (cached) return NextResponse.json({ ok: true, source: "llm", analysis: cached.analysis }, { headers: { "Cache-Control": "no-store" } });
    const advice = adviseImprovements(decisions, { budget });
    const payload = {
      ...toAnalyzeDto(result), budget, cityEvent: event,
      advisor: {
        startScore: advice.startScore, finalScore: advice.finalScore,
        steps: advice.steps.map((step) => ({ remove: describeDecision(step.remove), add: describeDecision(step.add), scoreAfter: step.scoreAfter, gain: step.gain })),
      },
    };
    // Bound external concurrency; the deterministic explanation stays available.
    while (requestTimes.length && requestTimes[0] < now - 60_000) requestTimes.shift();
    if (runningAnalyses < 3 && requestTimes.length < 20) {
      requestTimes.push(now);
      runningAnalyses++;
      try {
        const response = await analyzeSimulation(payload);
        if (response.ok) {
          if (analysisCache.size >= 100) analysisCache.delete(analysisCache.keys().next().value!);
          analysisCache.set(cacheKey, { analysis: response.analysis, expires: now + 5 * 60_000 });
          return NextResponse.json({ ...response, source: "llm" }, { headers: { "Cache-Control": "no-store" } });
        }
      } finally { runningAnalyses--; }
    }
    return NextResponse.json({ ok: true, source: "local", analysis: buildLocalAnalysis({ result, advice, budget, event }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ScenarioRequestError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    const status = error instanceof SimulationError ? 422 : error instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ ok: false, message: error instanceof SimulationError ? error.message : "Не удалось проанализировать сценарий." }, { status });
  }
}
