import { DISTRICTS_BY_ID } from "@/data/districts";
import { MEASURES_BY_ID } from "@/data/measures";
import { CATEGORY_LABELS, INDICATOR_GROUPS, INDICATOR_SHORT_LABELS, SIMULATION_HORIZON } from "@/domain/constants";
import { CATEGORIES } from "@/domain/types";
import type { DistrictId, Measure, SimulationResult } from "@/domain/types";
import type { Advice } from "@/engine/advisor";
import { realizedEffect, realizedFactor } from "@/engine/effects";
import { formatDelta, formatScore } from "@/lib/utils";

export function buildImpactPreview(measure: Measure, districtId?: DistrictId) {
  const entries = Object.entries(measure.effects).sort(
    ([, left], [, right]) => Math.abs(Number(right)) - Math.abs(Number(left)),
  );

  const districtName = measure.scope === "city"
    ? "каждом из 5 районов"
    : districtId && DISTRICTS_BY_ID[districtId]
      ? `районе ${DISTRICTS_BY_ID[districtId].nameRu}`
      : "выбранном районе";
  const summary = entries.length
    ? `${entries
        .map(([key, value]) => `${key} ${formatDelta(realizedEffect(value, measure.lag), 3)}`)
        .join(" · ")}`
    : "Нет изменений показателей";

  return {
    headline: measure.name,
    summary: `За ${SIMULATION_HORIZON} кварталов (2 года) в ${districtName}: ${summary}. Учтено ${realizedFactor(measure.lag) * 100}% полного эффекта; до ограничения шкалой 0–100 и без синергий.`,
    metrics: entries.map(([key, value]) => ({
      key,
      label: INDICATOR_SHORT_LABELS[key as keyof typeof INDICATOR_SHORT_LABELS],
      value: realizedEffect(value, measure.lag),
      fullValue: value,
    })),
  };
}

export function buildOpportunityCostMessage({
  measureName,
  cost,
  lag,
  budget,
  blockedMeasures = [],
}: {
  measureName: string;
  cost: number;
  lag: number;
  budget: number;
  blockedMeasures?: string[];
}) {
  const share = Math.round((cost / budget) * 100);
  const firstBlocker = blockedMeasures[0];

  const blockerText = firstBlocker
    ? `${firstBlocker} теперь недоступен`
    : "остаток бюджета не даёт бонуса к Score";

  return [
    `Вы выбрали ${measureName}.`,
    `− потрачено ${share}% бюджета`,
    `− эффект начинается через ${lag} квартала; за 2 года учтено ${realizedFactor(lag) * 100}%`,
    `− ${blockerText}`,
  ].join(" ");
}

export function buildCategoryOverview(result: SimulationResult) {
  return CATEGORIES.map((category) => {
    const count = result.decisions.filter((decision) => MEASURES_BY_ID[decision.measureId].category === category).length;
    const { keys } = INDICATOR_GROUPS[category];
    const changes = keys.map((key) => {
      const delta = result.comparisons.reduce((sum, district) =>
        sum + DISTRICTS_BY_ID[district.id].populationShare * district.delta[key], 0);
      return `${INDICATOR_SHORT_LABELS[key]} ${formatDelta(delta, 3)}`;
    });
    const critical = result.criticalIndicators.filter((item) => keys.includes(item.indicator));
    return {
      title: CATEGORY_LABELS[category],
      text: `${count > 0 ? `Выбрано мер направления: ${count}.` : "Прямые меры направления не выбраны."} Изменения показателей в среднем по населению: ${changes.join("; ")}. Критических значений после решений: ${critical.length}.`,
    };
  });
}

export function buildScenarioNarrative(result: SimulationResult, advice: Advice, budget: number) {
  const fixed = result.comparisons.reduce((sum, district) => sum + district.criticalBefore.filter((key) => !district.criticalAfter.includes(key)).length, 0);
  const facts = [
    `Самый слабый район после решений: ${result.weakestDistrict.name}, ${formatScore(result.weakestDistrict.score)} балла.`,
    `Закрыто критических значений: ${fixed}; осталось: ${result.criticalIndicators.length}.`,
    result.activatedSynergies.length > 0
      ? `Сработали синергии: ${result.activatedSynergies.map((item) => `${item.measureIds.join(" + ")} (${DISTRICTS_BY_ID[item.districtId].nameRu}, ${item.indicator} +${item.bonus})`).join("; ")}.`
      : "Синергии в выбранном наборе не сработали.",
  ];
  const declining = result.comparisons.flatMap((district) => Object.entries(district.delta)
    .filter(([, delta]) => delta < 0)
    .map(([key, delta]) => `${district.nameRu}: ${key} ${formatDelta(delta)}`));
  if (declining.length > 0) facts.push(`Ухудшения показателей: ${declining.join("; ")}.`);
  return {
    summary: `Score: ${formatScore(result.scoreBefore.finalScore)} → ${formatScore(result.finalScore)} (${formatDelta(result.scoreDelta)}). Потрачено ${result.totalCost} из ${budget} усл. ед.; остаток ${budget - result.totalCost} не даёт бонуса.`,
    facts,
    tradeoff: advice.steps.length > 0
      ? `Поиск замен нашёл улучшение до ${formatScore(advice.finalScore)} (${formatDelta(advice.finalScore - result.finalScore)}). Замены показаны выше и соблюдают лимит ${budget} усл. ед.`
      : advice.evaluatedScenarios > 0
        ? `Проверено замен: ${advice.evaluatedScenarios}. Улучшений не менее 0,01 балла не найдено; глобальный оптимум этим не гарантируется.`
        : "Поиск замен ещё не проводился.",
  };
}

export function buildDecisionContext(measure: Measure) {
  return {
    categoryLabel: CATEGORY_LABELS[measure.category],
    value: `${measure.cost} усл. ед.`,
  };
}
