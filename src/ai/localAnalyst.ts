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
import { MEASURES, MEASURES_BY_ID } from "@/data/measures";
import { SYNERGIES } from "@/data/synergies";
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
    `Потрачено ${result.totalCost} из ${budget} млрд ₸.`,
    leader && leader.scoreDelta > 0
      ? `Сильнее всего выиграл район ${leader.nameRu} (${formatDelta(leader.scoreDelta)}).`
      : "",
    fixed.length > 0
      ? `Снято критических провалов: ${fixed.length} из ${result.scoreBefore.criticalCount}.`
      : result.scoreBefore.criticalCount > 0
        ? "Критические провалы города остались без ответа."
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
      `Самый слабый район (${weakestComparison.nameRu}) вырос на ${formatDelta(weakestComparison.scoreDelta)} — это напрямую усиливает справедливую часть формулы (30% веса).`,
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
    risks.push(`Не использовано ${unused} млрд ₸ — остаток не влияет на Score, а деньги могли бы закрыть ещё одну проблему.`);
  }
  for (const item of result.measureContributions) {
    if (item.realizedFactor < 0.7) {
      risks.push(
        `«${MEASURES_BY_ID[item.measureId].name}» запускается через ${item.lag} кв.: за ${SIMULATION_HORIZON} кварталов реализуется только ${Math.round(item.realizedFactor * 100)}% эффекта.`,
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
      `Без финансирования остались направления: ${listRu(missing.map((category) => CATEGORY_LABELS[category]))}. Их показатели не изменятся.`,
    );
  }
  const untouched = result.comparisons.filter((item) => item.scoreDelta < 0.3);
  if (untouched.length > 0) {
    risks.push(
      `Почти без изменений: ${listRu(untouched.map((item) => item.nameRu))} — жители этих районов не почувствуют решений.`,
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
        `${names.length} районные меры сосредоточены в районе ${districtName(id)}: сильный локальный эффект ценой остальных районов.`,
      );
    }
  }
  const priciest = [...result.measureContributions].sort((a, b) => b.cost - a.cost)[0];
  if (priciest && priciest.cost / budget >= 0.25) {
    tradeoffs.push(
      `«${MEASURES_BY_ID[priciest.measureId].name}» забирает ${Math.round((priciest.cost / budget) * 100)}% бюджета — на эти деньги можно было взять 2–3 быстрые меры.`,
    );
  }
  const cityCount = result.decisions.filter((decision) => decision.scope === "city").length;
  if (cityCount > 0) {
    tradeoffs.push(
      `Общегородских мер: ${cityCount}. Они понемногу улучшают все 5 районов, но не вытаскивают отстающих так, как адресные районные меры.`,
    );
  }
  if (event) {
    tradeoffs.push(
      `Событие «${event.title}» изъяло ${event.reserve} млрд ₸: лимит сократился до ${budget} млрд ₸, и план пришлось уложить в меньший бюджет.`,
    );
  }

  for (const step of advice.steps) {
    recommendations.push(
      `Заменить ${describeDecision(step.remove)} на ${describeDecision(step.add)}: Score ${formatScore(step.scoreBefore)} → ${formatScore(step.scoreAfter)} (${formatDelta(step.gain)}).`,
    );
  }
  if (advice.steps.length === 0) {
    recommendations.push(
      `План локально оптимален: советник проверил ${advice.evaluatedScenarios} вариантов замены, и ни один не повышает Score.`,
    );
  }
  const selectedIds = new Set(result.decisions.map((decision) => decision.measureId));
  const worst = result.criticalIndicators[0];
  if (worst) {
    const helper = MEASURES.filter((measure) => !selectedIds.has(measure.id))
      .filter((measure) => (measure.effects[worst.indicator] ?? 0) > 0)
      .sort((a, b) => (b.effects[worst.indicator] ?? 0) - (a.effects[worst.indicator] ?? 0))[0];
    if (helper) {
      recommendations.push(
        `Чтобы закрыть провал «${INDICATOR_SHORT_LABELS[worst.indicator]}» в районе ${worst.districtName}, подходит «${helper.name}» (${helper.cost} млрд ₸).`,
      );
    }
  }

  for (const synergy of result.activatedSynergies) {
    synergyExplanation.push(synergy.description);
  }
  if (result.activatedSynergies.length === 0) {
    for (const rule of SYNERGIES) {
      const [a, b] = rule.measureIds;
      const hasA = selectedIds.has(a);
      const hasB = selectedIds.has(b);
      if (hasA !== hasB) {
        const missingId = hasA ? b : a;
        synergyExplanation.push(
          `Добавив «${MEASURES_BY_ID[missingId].name}», вы активируете синергию «${rule.title}» (+${rule.bonus} к показателю «${INDICATOR_SHORT_LABELS[rule.indicator]}»).`,
        );
      }
    }
  }

  const districtInsights: DistrictInsight[] = result.comparisons.map((item) => {
    const names = perDistrict.get(item.id) ?? [];
    const critical = item.criticalAfter.map((key) => INDICATOR_SHORT_LABELS[key as IndicatorKey]);
    const parts = [
      `${formatScore(item.scoreBefore)} → ${formatScore(item.scoreAfter)} (${formatDelta(item.scoreDelta)}).`,
      names.length > 0 ? `Адресные меры: ${names.join(", ")}.` : "Только общегородские меры.",
      critical.length > 0 ? `Остаётся критично: ${critical.join(", ")}.` : "Критических провалов нет.",
    ];
    return { districtId: item.id, text: parts.join(" ") };
  });

  return {
    summary,
    strengths: strengths.length > 0 ? strengths : ["Сценарий удерживает город без ухудшений."],
    risks,
    tradeoffs,
    recommendations,
    districtInsights,
    synergyExplanation,
  };
}
