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
    `Старт: ${formatScore(result.scoreBefore.finalScore)} · Потрачено: ${result.totalCost} из ${budget} усл. ед. · Остаток: ${budget - result.totalCost} усл. ед. · Критических провалов: ${result.scoreBefore.criticalCount} → ${result.criticalIndicators.length}`,
    "Данные синтетические; цены выражены в условных единицах без пересчёта в реальную валюту. Горизонт: 8 кварталов. Остаток бюджета не даёт бонуса.",
    event ? `\nГородское событие: **${event.title}** — резерв ${event.reserve} усл. ед.; доступный лимит ${budget} усл. ед.` : "Городское событие: нет.",
    "",
    "## 5 решений",
    "",
    "| # | Мера | Где | Стоимость | Лаг, кв. | Доля эффекта |",
    "|---|---|---|---:|---:|---:|",
    ...result.decisions.map((decision, index) => {
      const measure = MEASURES_BY_ID[decision.measureId];
      const place = decision.scope === "city" ? "Весь город" : DISTRICTS_BY_ID[decision.districtId].nameRu;
      const contribution = result.measureContributions.find((item) => item.measureId === decision.measureId);
      return `| ${index + 1} | ${measure.name} | ${place} | ${contribution?.cost ?? measure.cost} усл. ед. | ${contribution?.lag ?? measure.lag} | ${contribution ? `${contribution.realizedFactor * 100}%` : "—"} |`;
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
    `## Вывод ${input.analysisSource === "llm" ? "AI-аналитика (LLM)" : "резервного аналитика по правилам (без LLM)"}`,
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
      ? `Улучшенный план поиска замен: ${formatScore(advice.startScore)} → ${formatScore(advice.finalScore)}.`
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
