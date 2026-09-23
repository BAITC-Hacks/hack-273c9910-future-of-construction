import type { AiAnalysis } from "@/domain/types";
import { aiAnalysisSchema } from "@/lib/schemas";
import { ANALYST_SYSTEM_PROMPT, buildAnalystUserPrompt } from "./prompts";
import { defaultProvider, type LlmProvider } from "./provider";

export const AI_UNAVAILABLE_MESSAGE =
  "AI-анализ временно недоступен. Расчёт симуляции выполнен успешно.";

export type AnalystResponse =
  | { ok: true; analysis: AiAnalysis }
  | { ok: false; message: string };

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : trimmed;
  return JSON.parse(raw);
}

export async function analyzeSimulation(
  payload: unknown,
  provider: LlmProvider = defaultProvider,
): Promise<AnalystResponse> {
  if (!provider.isConfigured()) {
    return { ok: false, message: AI_UNAVAILABLE_MESSAGE };
  }

  try {
    const content = await provider.complete({
      messages: [
        { role: "system", content: ANALYST_SYSTEM_PROMPT },
        { role: "user", content: buildAnalystUserPrompt(payload) },
      ],
    });
    const parsed = aiAnalysisSchema.parse(extractJson(content));
    return { ok: true, analysis: parsed };
  } catch {
    return { ok: false, message: AI_UNAVAILABLE_MESSAGE };
  }
}
