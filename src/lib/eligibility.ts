import { BUDGET, MAX_MEASURES_PER_CATEGORY, REQUIRED_DECISIONS } from "@/domain/constants";
import type { Decision, DistrictId, Measure, MeasureId } from "@/domain/types";
import {
  GLOBAL_INCOMPATIBILITIES,
  SAME_DISTRICT_INCOMPATIBILITIES,
} from "@/data/incompatibilities";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { MEASURES_BY_ID } from "@/data/measures";
import { validateDecisions } from "@/engine/validator";
import { totalCostOf } from "@/engine/validator";

export const NEEDS_DISTRICT = "Сначала выберите район.";

export function selectedMeasureIds(decisions: Decision[]): Set<MeasureId> {
  return new Set(decisions.map((decision) => decision.measureId));
}

export function categoryCount(decisions: Decision[], category: Measure["category"]): number {
  return decisions.filter(
    (decision) => MEASURES_BY_ID[decision.measureId]?.category === category,
  ).length;
}

export function whyBlocked(
  decisions: Decision[],
  measure: Measure,
  districtId?: DistrictId,
  budget: number = BUDGET,
): string | null {
  if (decisions.some((decision) => decision.measureId === measure.id)) {
    return "Мероприятие уже выбрано.";
  }
  if (decisions.length >= REQUIRED_DECISIONS) {
    return "Можно выбрать только 5 мероприятий.";
  }
  const left = budget - totalCostOf(decisions);
  if (measure.cost > left) {
    return `Не хватает бюджета: осталось ${left} усл. ед.`;
  }
  if (categoryCount(decisions, measure.category) >= MAX_MEASURES_PER_CATEGORY) {
    return "Не больше двух мероприятий одного направления.";
  }

  const selected = selectedMeasureIds(decisions);
  for (const rule of GLOBAL_INCOMPATIBILITIES) {
    const other = rule.measureIds[0] === measure.id ? rule.measureIds[1] : rule.measureIds[1] === measure.id ? rule.measureIds[0] : null;
    if (other && selected.has(other)) {
      return rule.message;
    }
  }

  if (measure.scope === "district" && !districtId) {
    return NEEDS_DISTRICT;
  }

  if (measure.scope === "district" && districtId) {
    const candidate: Decision = {
      measureId: measure.id,
      scope: "district",
      districtId,
    };
    const next = [...decisions, candidate];
    const validation = validateDecisions(next, "partial", budget);
    if (!validation.ok) {
      return validation.errors[0]?.message ?? "Решение недопустимо.";
    }
  }

  if (measure.scope === "city") {
    const validation = validateDecisions(
      [...decisions, { measureId: measure.id, scope: "city" }],
      "partial",
      budget,
    );
    if (!validation.ok) {
      return validation.errors[0]?.message ?? "Решение недопустимо.";
    }
  }

  return null;
}

export function districtConflictHint(
  decisions: Decision[],
  measure: Measure,
  districtId: DistrictId,
): string | null {
  for (const rule of SAME_DISTRICT_INCOMPATIBILITIES) {
    const otherId =
      rule.measureIds[0] === measure.id
        ? rule.measureIds[1]
        : rule.measureIds[1] === measure.id
          ? rule.measureIds[0]
          : null;
    if (!otherId) continue;
    const other = decisions.find((decision) => decision.measureId === otherId);
    if (other?.scope === "district" && other.districtId === districtId) {
      return rule.message(DISTRICTS_BY_ID[districtId].nameRu);
    }
  }
  return null;
}
