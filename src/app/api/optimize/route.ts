import { NextResponse } from "next/server";
import { optimizeScenarios } from "@/engine/optimizer";

export async function POST() {
  try {
    const result = optimizeScenarios();
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Не удалось подобрать альтернативный сценарий." },
      { status: 500 },
    );
  }
}
