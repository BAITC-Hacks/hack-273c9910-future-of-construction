import { NextResponse } from "next/server";
import { getScenarioBudget } from "@/data/events";
import { simulateDecisions, SimulationError } from "@/engine/simulation";
import { validateDecisions } from "@/engine/validator";
import { simulateRequestSchema } from "@/lib/schemas";
import { readScenarioBody, ScenarioRequestError } from "@/lib/scenario-http";

export async function POST(request: Request) {
  try {
    const body = await readScenarioBody(request);
    const parsed = simulateRequestSchema.safeParse(body);

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

    const budget = getScenarioBudget(parsed.data.eventId);
    const validation = validateDecisions(parsed.data.decisions, "final", budget);
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, errors: validation.errors },
        { status: 422 },
      );
    }

    const result = simulateDecisions(parsed.data.decisions, budget);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof ScenarioRequestError) return NextResponse.json({ ok: false, errors: [{ code: "INVALID_REQUEST", message: error.message }] }, { status: error.status });
    if (error instanceof SimulationError) {
      return NextResponse.json(
        {
          ok: false,
          errors: error.messages.map((message) => ({
            code: "SIMULATION",
            message,
          })),
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { ok: false, errors: [{ code: "SERVER", message: "Не удалось выполнить симуляцию." }] },
      { status: 500 },
    );
  }
}
