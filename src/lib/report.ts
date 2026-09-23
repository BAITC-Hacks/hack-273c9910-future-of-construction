import type { AiAnalysis, SimulationResult } from "@/domain/types";
import type { CityEvent } from "@/data/events";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { MEASURES_BY_ID } from "@/data/measures";
import type { Advice } from "@/engine/advisor";
import { formatDelta, formatScore } from "./utils";

export type ReportInput = {
  team: string;
  result: SimulationResult;
  analysis: AiAnalysis;
  analysisSource: "llm" | "local";
  advice: Advice;
  budget: number;
  event: CityEvent | null;
};

function bullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- —";
}

export function buildReportMarkdown(input: ReportInput): string {
  const { team, result, analysis, advice, budget, event } = input;
  const title = team.trim() || "Команда";
  const lines = [
    `# «Аким на 5 часов» — решение команды «${title}»`,
    "",
    `## Astana Quality of Life Score: ${formatScore(result.finalScore)} (${formatDelta(result.scoreDelta)})`,
    "",
    `Старт: ${formatScore(result.scoreBefore.finalScore)} · Потрачено: ${result.totalCost} из ${budget} млрд ₸ · Критических провалов: ${result.scoreBefore.criticalCount} → ${result.criticalIndicators.length}`,
    event ? `\nГородское событие: **${event.title}** — изъято ${event.reserve} млрд ₸.` : "",
    "",
    "## 5 решений",
    "",
    "| # | Мера | Где | Стоимость |",
    "|---|---|---|---:|",
    ...result.decisions.map((decision, index) => {
      const measure = MEASURES_BY_ID[decision.measureId];
      const place = decision.scope === "city" ? "Весь город" : DISTRICTS_BY_ID[decision.districtId].nameRu;
      return `| ${index + 1} | ${measure.name} | ${place} | ${measure.cost} млрд ₸ |`;
    }),
    "",
    "## Районы до и после",
    "",
    "| Район | Было | Стало | Δ |",
    "|---|---:|---:|---:|",
    ...result.comparisons.map(
      (item) =>
        `| ${item.nameRu} | ${formatScore(item.scoreBefore)} | ${formatScore(item.scoreAfter)} | ${formatDelta(item.scoreDelta)} |`,
    ),
    "",
    `## Вывод ${input.analysisSource === "llm" ? "AI-аналитика" : "аналитика"}`,
    "",
    analysis.summary,
    "",
    "### Сильные стороны",
    bullets(analysis.strengths),
    "",
    "### Риски",
    bullets(analysis.risks),
    "",
    "### Компромиссы и последствия",
    bullets(analysis.tradeoffs),
    "",
    "### Рекомендации",
    bullets(analysis.recommendations),
    "",
    advice.steps.length > 0
      ? `Улучшенный план советника: ${formatScore(advice.startScore)} → ${formatScore(advice.finalScore)}.`
      : "",
    "",
    "_Все числа рассчитаны детерминированным движком симуляции; AI только объясняет результат._",
  ];
  return lines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n");
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
