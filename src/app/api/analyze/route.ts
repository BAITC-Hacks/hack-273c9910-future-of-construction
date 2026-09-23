import { NextResponse } from "next/server";
import { analyzeSimulation } from "@/ai/analyst";
import { analyzeRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = analyzeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Некорректный payload для AI-анализа." },
        { status: 400 },
      );
    }

    const analysis = await analyzeSimulation(parsed.data);
    if (!analysis.ok) {
      return NextResponse.json(
        { ok: false, message: analysis.message },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true, analysis: analysis.analysis });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "AI-анализ временно недоступен. Расчёт симуляции выполнен успешно.",
      },
      { status: 200 },
    );
  }
}
