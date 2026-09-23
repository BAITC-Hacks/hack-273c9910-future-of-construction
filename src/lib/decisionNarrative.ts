import { DISTRICTS_BY_ID } from "@/data/districts";
import { CATEGORY_LABELS, INDICATOR_SHORT_LABELS } from "@/domain/constants";
import type { DistrictId, Measure } from "@/domain/types";

export function buildImpactPreview(measure: Measure, districtId?: DistrictId) {
  const entries = Object.entries(measure.effects).sort(
    ([, left], [, right]) => Math.abs(Number(right)) - Math.abs(Number(left)),
  );

  const topSignals = entries.slice(0, 2);
  const districtName = districtId && DISTRICTS_BY_ID[districtId] ? DISTRICTS_BY_ID[districtId].nameRu : "город";
  const summary = topSignals.length
    ? `${topSignals
        .map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`)
        .join(" · ")}`
    : "Эффект распределяется по нескольким показателям";

  const emphasis =
    measure.category === "social"
      ? "Это особенно важно для слабых районов, где дефицит социальной инфраструктуры действует как ограничение роста качества жизни."
      : measure.category === "transport"
        ? "Основной эффект будет заметен в мобильности, времени в пути и доступности общественного транспорта."
        : measure.category === "ecology"
          ? "Эффект проявится в воздухе, озеленении и комфортности городской среды."
          : "Решение укрепляет городскую устойчивость, но не меняет фондовый баланс мгновенно.";

  return {
    headline: measure.name,
    summary: `Через 2 года в ${districtName}: ${summary}. ${emphasis}`,
    metrics: topSignals.map(([key, value]) => ({
      key,
      label: INDICATOR_SHORT_LABELS[key as keyof typeof INDICATOR_SHORT_LABELS],
      value,
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
    : "часть альтернативных инвестиций отложена";

  return [
    `Вы выбрали ${measureName}.`,
    `✓ эффект реально влияет на качество жизни, но`,
    `− потрачено ${share}% бюджета`,
    `− эффект реализуется только через ${lag} квартала`,
    `− ${blockerText}`,
  ].join(" ");
}

export function buildAiCouncil() {
  return [
    {
      title: "🏗 Инфраструктура",
      text: "Поддерживаю транспортную часть, однако модернизация ЖКХ и сервисов остаётся ограниченной для низкоинтенсивных районов.",
    },
    {
      title: "🌱 Экология",
      text: "Основная экологическая проблема Сарыарки частично решается, но озеленение и устойчивость среды всё ещё остаются в зоне риска.",
    },
    {
      title: "👥 Социальная политика",
      text: "Приоритет Нуры обоснован двумя критическими показателями: школы и первичная медицина остаются слабейшим звеном городской системы.",
    },
  ];
}

export function buildDecisionContext(measure: Measure) {
  return {
    categoryLabel: CATEGORY_LABELS[measure.category],
    value: `${measure.cost} млрд ₸`,
  };
}
