import { NextResponse } from "next/server";
import { answerConsultant, localConsultant } from "@/ai/consultant";
import { consultantRequestSchema } from "@/lib/consultant";
import { readScenarioBody, ScenarioRequestError } from "@/lib/scenario-http";
import { validateDecisions } from "@/engine/validator";

export const runtime = "nodejs";
let running = 0;
const requestTimes: number[] = [];

export async function POST(request: Request) {
  try {
    const parsed = consultantRequestSchema.safeParse(await readScenarioBody(request));
    if (!parsed.success) return NextResponse.json({ message: "Проверьте вопрос и текущий план." }, { status: 400 });
    // Validate the original plan at the base budget; event overruns are explained by the consultant.
    const validation = validateDecisions(parsed.data.decisions, "partial");
    if (!validation.ok) return NextResponse.json({ message: validation.errors.map((error) => error.message).join(" ") }, { status: 422 });
    const now = Date.now();
    while (requestTimes.length && requestTimes[0] < now - 60_000) requestTimes.shift();
    if (running >= 3 || requestTimes.length >= 20) {
      return NextResponse.json({ ...localConsultant(parsed.data), source: "local" }, { headers: { "Cache-Control": "no-store" } });
    }
    requestTimes.push(now);
    running++;
    try {
      return NextResponse.json(await answerConsultant(parsed.data), { headers: { "Cache-Control": "no-store" } });
    } finally { running--; }
  } catch (error) {
    return NextResponse.json({ message: error instanceof ScenarioRequestError ? error.message : "Консультант временно недоступен. Попробуйте ещё раз." }, { status: error instanceof ScenarioRequestError ? error.status : 500 });
  }
}
