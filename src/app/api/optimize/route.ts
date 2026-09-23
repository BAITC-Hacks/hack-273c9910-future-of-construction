import { NextResponse } from "next/server";
import { CITY_EVENTS, getScenarioBudget } from "@/data/events";
import type { OptimizeResult } from "@/domain/types";
import { optimizeScenarios } from "@/engine/optimizer";
import { optimizeRequestSchema } from "@/lib/schemas";
import { readScenarioBody, ScenarioRequestError } from "@/lib/scenario-http";

// Only server-defined event budgets can reach this bounded process-local cache.
const CACHE_LIMIT = CITY_EVENTS.length + 1;
const resultsByBudget = new Map<number, OptimizeResult>();

function respondWithOptimization(budget: number) {
  try {
    let result = resultsByBudget.get(budget);
    if (!result) {
      result = optimizeScenarios(budget);
      if (resultsByBudget.size >= CACHE_LIMIT) {
        const oldestBudget = resultsByBudget.keys().next().value;
        if (oldestBudget !== undefined) resultsByBudget.delete(oldestBudget);
      }
      resultsByBudget.set(budget, result);
    }
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Не удалось подобрать альтернативный сценарий." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return respondWithOptimization(getScenarioBudget());
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await readScenarioBody(request); }
  catch (error) { return NextResponse.json({ ok: false, message: error instanceof ScenarioRequestError ? error.message : "Ошибка запроса." }, { status: error instanceof ScenarioRequestError ? error.status : 500 }); }
  const parsed = optimizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: parsed.error.issues.map((issue) => ({
          code: "INVALID_REQUEST",
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  return respondWithOptimization(getScenarioBudget(parsed.data.eventId));
}
