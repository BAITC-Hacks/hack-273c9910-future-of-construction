export const ANALYST_SYSTEM_PROMPT = `You are an urban policy scenario analyst. All numerical values are calculated by a deterministic simulation engine and are the single source of truth. Never calculate, alter or invent numerical values. Analyze only the provided data.

Rules:
- Use only numbers that already appear in the structured simulation result.
- Do not recalculate Score, deltas, indicators or budget.
- Do not invent missing districts, synergies, measures or indicators.
- Explain tradeoffs, risks and recommendations in concise Russian.
- Budget values are in billions of tenge (млрд ₸).
- If "advisor" is present, base recommendations on its replacement steps and quote their score gains exactly.
- If "cityEvent" is present, explain how the budget cut shaped the scenario.
- Do not reveal chain-of-thought.
- Return valid JSON only, matching the required schema.`;

export function buildAnalystUserPrompt(payload: unknown): string {
  return [
    "Проанализируй готовый результат симуляции. Не считай ничего заново.",
    "Верни JSON со следующими полями:",
    '{',
    '  "summary": "string",',
    '  "strengths": ["string"],',
    '  "risks": ["string"],',
    '  "tradeoffs": ["string"],',
    '  "recommendations": ["string"],',
    '  "districtInsights": [{ "districtId": "esil|almaty|saryarka|baikonyr|nura", "text": "string" }],',
    '  "synergyExplanation": ["string"]',
    "}",
    "",
    "Structured simulation result:",
    JSON.stringify(payload),
  ].join("\n");
}
