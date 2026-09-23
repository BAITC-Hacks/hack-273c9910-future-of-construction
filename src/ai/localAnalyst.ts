import {
  CATEGORY_LABELS,
  INDICATOR_LABELS,
  INDICATOR_SHORT_LABELS,
  SIMULATION_HORIZON,
} from "@/domain/constants";
import { CATEGORIES } from "@/domain/types";
import type {
  AiAnalysis,
  Decision,
  DistrictId,
  DistrictInsight,
  IndicatorKey,
  SimulationResult,
} from "@/domain/types";
import { DISTRICTS_BY_ID } from "@/data/districts";
import type { CityEvent } from "@/data/events";
import { MEASURES_BY_ID } from "@/data/measures";
import type { Advice } from "@/engine/advisor";
import { formatDelta, formatScore } from "@/lib/utils";

export type LocalAnalysisContext = {
  result: SimulationResult;
  advice: Advice;
  budget: number;
  event?: CityEvent | null;
};

export function describeDecision(decision: Decision): string {
  const name = MEASURES_BY_ID[decision.measureId].name;
  return decision.scope === "city"
    ? `«${name}» (весь город)`
    : `«${name}» (${DISTRICTS_BY_ID[decision.districtId].nameRu})`;
}

function districtName(id: DistrictId): string {
  return DISTRICTS_BY_ID[id].nameRu;
}

function listRu(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`;
}

export function buildLocalAnalysis({ result, advice, budget, event }: LocalAnalysisContext): AiAnalysis {
  const strengths: string[] = [];
  const risks: string[] = [];
  const tradeoffs: string[] = [];
  const recommendations: string[] = [];
  const synergyExplanation: string[] = [];

  const ranked = [...result.comparisons].sort((a, b) => b.scoreDelta - a.scoreDelta);
  const leader = ranked[0];
  const weakestBefore = result.scoreBefore.weakestDistrictId;
  const weakestComparison = result.comparisons.find((item) => item.id === weakestBefore);

  const fixed = result.comparisons.flatMap((item) =>
    item.criticalBefore
      .filter((key) => !item.criticalAfter.includes(key))
      .map((key) => `${item.nameRu} — ${INDICATOR_SHORT_LABELS[key as IndicatorKey]}`),
  );

  const summary = [
    `Сценарий меняет Astana Quality of Life Score с ${formatScore(result.scoreBefore.finalScore)} до ${formatScore(result.finalScore)} (${formatDelta(result.scoreDelta)}).`,
    `Потрачено ${result.totalCost} из ${budget} усл. ед.`,
    leader && leader.scoreDelta > 0
      ? `Сильнее всего выиграл район ${leader.nameRu} (${formatDelta(leader.scoreDelta)}).`
      : "",
    fixed.length > 0
      ? `Снято критических провалов: ${fixed.length} из ${result.scoreBefore.criticalCount}.`
      : result.scoreBefore.criticalCount > 0
        ? "Исходные критические показатели пока остаются ниже порога 40."
        : "",
  ]
    .filter(Boolean)
    .join(" ");

  for (const item of ranked.slice(0, 2)) {
    if (item.scoreDelta > 0.3) {
      strengths.push(
        `${item.nameRu}: оценка района ${formatScore(item.scoreBefore)} → ${formatScore(item.scoreAfter)} (${formatDelta(item.scoreDelta)}).`,
      );
    }
  }
  if (fixed.length > 0) {
    strengths.push(`Закрыты критические провалы (ниже 40): ${listRu(fixed)}. Каждый снятый провал возвращает 1 балл к Score.`);
  }
  if (weakestComparison && weakestComparison.scoreDelta > 0.5) {
    strengths.push(
      `Исходно самый слабый район (${weakestComparison.nameRu}) вырос на ${formatDelta(weakestComparison.scoreDelta)}. После решений минимальная оценка района равна ${formatScore(result.weakestDistrict.score)}; она входит в Score с весом 30%.`,
    );
  }
  const quick = result.measureContributions.filter((item) => item.lag <= 1);
  if (quick.length >= 2) {
    strengths.push(
      `${quick.length} меры дают эффект уже в первом квартале и реализуются почти полностью за горизонт.`,
    );
  }
  for (const synergy of result.activatedSynergies) {
    strengths.push(
      `Синергия «${synergy.title}»: +${synergy.bonus} к показателю «${INDICATOR_SHORT_LABELS[synergy.indicator]}» в районе ${districtName(synergy.districtId)}.`,
    );
  }

  for (const item of result.criticalIndicators) {
    risks.push(
      `${item.districtName}: показатель «${INDICATOR_LABELS[item.indicator]}» остаётся критическим (${formatScore(item.value, 1)}), штраф −1 к Score.`,
    );
  }
  const unused = budget - result.totalCost;
  if (unused >= 5) {
    tradeoffs.push(`Осталось ${unused} усл. ед. Остаток не даёт бонуса; улучшение возможно только заменами внутри пяти решений.`);
  }
  for (const item of result.measureContributions) {
    if (item.realizedFactor < 0.7) {
      risks.push(
        `«${MEASURES_BY_ID[item.measureId].name}» запускается через ${item.lag} кв.: за ${SIMULATION_HORIZON} кварталов реализуется ${item.realizedFactor * 100}% полного эффекта.`,
      );
    }
  }
  for (const item of result.measureContributions) {
    const negatives = item.effects.filter((effect) => effect.realizedEffect < 0);
    if (negatives.length === 0) continue;
    const first = negatives[0];
    risks.push(
      `«${MEASURES_BY_ID[item.measureId].name}» ухудшает показатель «${INDICATOR_SHORT_LABELS[first.indicator]}» (${formatDelta(first.realizedEffect)} в районе ${districtName(first.districtId)}).`,
    );
  }
  const covered = new Set(result.decisions.map((decision) => MEASURES_BY_ID[decision.measureId].category));
  const missing = CATEGORIES.filter((category) => !covered.has(category));
  if (missing.length > 0) {
    risks.push(
      `Прямые меры не выбраны в направлениях: ${listRu(missing.map((category) => CATEGORY_LABELS[category]))}. Их показатели могут меняться из-за эффектов мер других направлений.`,
    );
  }
  const untouched = result.comparisons.filter((item) => Math.abs(item.scoreDelta) < 0.3);
  if (untouched.length > 0) {
    risks.push(
      `Изменение оценки менее 0,3 балла: ${listRu(untouched.map((item) => item.nameRu))}.`,
    );
  }

  const perDistrict = new Map<DistrictId, string[]>();
  for (const decision of result.decisions) {
    if (decision.scope !== "district") continue;
    const list = perDistrict.get(decision.districtId) ?? [];
    list.push(MEASURES_BY_ID[decision.measureId].name);
    perDistrict.set(decision.districtId, list);
  }
  for (const [id, names] of perDistrict) {
    if (names.length >= 3) {
      tradeoffs.push(
        `${names.length} районные меры сосредоточены в районе ${districtName(id)}; их прямые эффекты не распространяются на остальные районы.`,
      );
    }
  }
  const priciest = [...result.measureContributions].sort((a, b) => b.cost - a.cost)[0];
  if (priciest && priciest.cost / budget >= 0.25) {
    tradeoffs.push(
      `«${MEASURES_BY_ID[priciest.measureId].name}» занимает ${Math.round((priciest.cost / budget) * 100)}% бюджета. На остальные решения доступно ${budget - priciest.cost} усл. ед.`,
    );
  }
  const cityCount = result.decisions.filter((decision) => decision.scope === "city").length;
  if (cityCount > 0) {
    tradeoffs.push(
      `Общегородских мер: ${cityCount}. Их эффекты применяются ко всем 5 районам; эффект каждой районной меры ограничен выбранным районом.`,
    );
  }
  if (event) {
    tradeoffs.push(
      `Событие «${event.title}» резервирует ${event.reserve} усл. ед. Доступный лимит: ${budget} усл. ед.`,
    );
  }

  for (const step of advice.steps) {
    recommendations.push(
      `Заменить ${describeDecision(step.remove)} на ${describeDecision(step.add)}: Score ${formatScore(step.scoreBefore)} → ${formatScore(step.scoreAfter)} (${formatDelta(step.gain)}).`,
    );
  }
  if (advice.steps.length === 0) {
    recommendations.push(
      advice.evaluatedScenarios > 0
        ? `Поиск проверил ${advice.evaluatedScenarios} вариантов замены и не нашёл улучшений не менее 0,01 балла. Это не доказательство глобального оптимума.`
        : "Поиск замен ещё не проводился.",
    );
  }
  for (const synergy of result.activatedSynergies) {
    synergyExplanation.push(`${synergy.title}: ${synergy.indicator} +${synergy.bonus} в районе ${districtName(synergy.districtId)}. Бонус не масштабируется лагом.`);
  }

  const districtInsights: DistrictInsight[] = result.comparisons.map((item) => {
    const names = perDistrict.get(item.id) ?? [];
    const critical = item.criticalAfter.map((key) => INDICATOR_SHORT_LABELS[key as IndicatorKey]);
    const parts = [
      `${formatScore(item.scoreBefore)} → ${formatScore(item.scoreAfter)} (${formatDelta(item.scoreDelta)}).`,
      names.length > 0
        ? `Адресные меры: ${names.join(", ")}.`
        : cityCount > 0
          ? "На район действуют только общегородские меры."
          : "Для района не выбраны меры.",
      critical.length > 0 ? `Остаётся критично: ${critical.join(", ")}.` : "Критических провалов нет.",
    ];
    return { districtId: item.id, text: parts.join(" ") };
  });

  return {
    summary,
    strengths,
    risks,
    tradeoffs,
    recommendations,
    districtInsights,
    synergyExplanation,
  };
}
