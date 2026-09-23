import {
  BUDGET,
  CATEGORY_LABELS,
  MAX_MEASURES_PER_CATEGORY,
  REQUIRED_DECISIONS,
} from "@/domain/constants";
import type {
  Category,
  Decision,
  DistrictId,
  MeasureId,
  ValidationError,
  ValidationResult,
} from "@/domain/types";
import { DISTRICTS_BY_ID } from "@/data/districts";
import {
  GLOBAL_INCOMPATIBILITIES,
  SAME_DISTRICT_INCOMPATIBILITIES,
} from "@/data/incompatibilities";
import { MEASURES_BY_ID } from "@/data/measures";

export type ValidateMode = "final" | "partial";

function addError(
  errors: ValidationError[],
  code: string,
  message: string,
): void {
  if (!errors.some((error) => error.code === code && error.message === message)) {
    errors.push({ code, message });
  }
}

export function validateDecisions(
  decisions: Decision[],
  mode: ValidateMode = "final",
  budget: number = BUDGET,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Number.isFinite(budget) || budget < 0) {
    addError(errors, "INVALID_BUDGET", "Бюджет должен быть конечным неотрицательным числом.");
  }

  if (mode === "final" && decisions.length !== REQUIRED_DECISIONS) {
    addError(
      errors,
      "DECISION_COUNT",
      `Необходимо выбрать ровно ${REQUIRED_DECISIONS} мероприятий. Сейчас выбрано: ${decisions.length}.`,
    );
  }

  if (mode === "partial" && decisions.length > REQUIRED_DECISIONS) {
    addError(
      errors,
      "DECISION_COUNT",
      `Нельзя выбрать больше ${REQUIRED_DECISIONS} мероприятий.`,
    );
  }

  const seen = new Set<MeasureId>();
  const categoryCounts: Partial<Record<Category, number>> = {};
  const assignments: Partial<Record<MeasureId, DistrictId | "city">> = {};
  let totalCost = 0;

  for (const decision of decisions) {
    if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
      addError(errors, "INVALID_DECISION", "Решение должно быть объектом мероприятия.");
      continue;
    }

    const allowedFields = decision.scope === "district"
      ? ["measureId", "scope", "districtId"]
      : ["measureId", "scope"];
    const extraFields = Object.keys(decision).filter((key) => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      addError(
        errors,
        "UNEXPECTED_FIELDS",
        decision.scope === "city" && extraFields.includes("districtId")
          ? "Для городского мероприятия район не указывается."
          : `Недопустимые поля решения: ${extraFields.join(", ")}.`,
      );
    }

    const measure = Object.prototype.hasOwnProperty.call(MEASURES_BY_ID, decision.measureId)
      ? MEASURES_BY_ID[decision.measureId]
      : undefined;
    if (!measure) {
      addError(
        errors,
        "UNKNOWN_MEASURE",
        `Неизвестное мероприятие: ${decision.measureId}.`,
      );
      continue;
    }

    if (seen.has(decision.measureId)) {
      addError(
        errors,
        "DUPLICATE_MEASURE",
        `Мероприятие «${measure.name}» (${measure.id}) можно выбрать только один раз.`,
      );
    }
    seen.add(decision.measureId);

    if (decision.scope !== measure.scope) {
      addError(
        errors,
        "SCOPE_MISMATCH",
        measure.scope === "city"
          ? `Мероприятие «${measure.name}» действует на весь город и не требует выбора района.`
          : `Для мероприятия «${measure.name}» необходимо указать район.`,
      );
    }

    if (decision.scope === "district") {
      const district = Object.prototype.hasOwnProperty.call(DISTRICTS_BY_ID, decision.districtId)
        ? DISTRICTS_BY_ID[decision.districtId]
        : undefined;
      if (!district) {
        addError(
          errors,
          "UNKNOWN_DISTRICT",
          `Неизвестный район: ${decision.districtId}.`,
        );
      } else {
        assignments[decision.measureId] = decision.districtId;
      }
    } else {
      assignments[decision.measureId] = "city";
    }

    categoryCounts[measure.category] = (categoryCounts[measure.category] ?? 0) + 1;
    totalCost += measure.cost;
  }

  for (const [category, count] of Object.entries(categoryCounts)) {
    if ((count ?? 0) > MAX_MEASURES_PER_CATEGORY) {
      addError(
        errors,
        "CATEGORY_LIMIT",
        `Нельзя выбрать больше ${MAX_MEASURES_PER_CATEGORY} мероприятий одного направления. Направление «${CATEGORY_LABELS[category as Category]}» выбрано ${count} раз.`,
      );
    }
  }

  if (totalCost > budget) {
    addError(
      errors,
      "BUDGET",
      `Бюджет превышен: потрачено ${totalCost} усл. ед. при лимите ${budget} усл. ед.`,
    );
  }

  const selected = seen;

  for (const rule of GLOBAL_INCOMPATIBILITIES) {
    const [a, b] = rule.measureIds;
    if (selected.has(a) && selected.has(b)) {
      addError(errors, "INCOMPATIBLE_GLOBAL", rule.message);
    }
  }

  for (const rule of SAME_DISTRICT_INCOMPATIBILITIES) {
    const [a, b] = rule.measureIds;
    const left = assignments[a];
    const right = assignments[b];
    if (
      left &&
      right &&
      left !== "city" &&
      right !== "city" &&
      left === right
    ) {
      const districtName = DISTRICTS_BY_ID[left]?.nameRu ?? left;
      addError(errors, "INCOMPATIBLE_DISTRICT", rule.message(districtName));
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}

export function totalCostOf(decisions: Decision[]): number {
  return decisions.reduce((sum, decision) => {
    const measure = MEASURES_BY_ID[decision.measureId];
    return sum + (measure?.cost ?? 0);
  }, 0);
}
