import { NextResponse } from "next/server";
import { simulateDecisions, SimulationError } from "@/engine/simulation";
import { validateDecisions } from "@/engine/validator";
import { simulateRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    const validation = validateDecisions(parsed.data.decisions, "final");
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, errors: validation.errors },
        { status: 422 },
      );
    }

    const result = simulateDecisions(parsed.data.decisions);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
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
