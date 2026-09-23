import { describe, expect, it } from "vitest";
import { MEASURES_BY_ID } from "@/data/measures";
import { buildCategoryOverview, buildImpactPreview, buildOpportunityCostMessage, buildScenarioNarrative } from "@/lib/decisionNarrative";
import { simulateDecisions } from "@/engine/simulation";
import type { Advice } from "@/engine/advisor";
import type { Decision, SimulationResult } from "@/domain/types";
import { CONTROL_SCENARIO } from "./fixtures";

const withoutSocial: Decision[] = [
  { measureId: "M1", scope: "district", districtId: "esil" },
  { measureId: "M4", scope: "district", districtId: "almaty" },
  { measureId: "M10", scope: "district", districtId: "esil" },
  { measureId: "M11", scope: "district", districtId: "esil" },
  { measureId: "M14", scope: "city" },
];

function noAdvice(result: SimulationResult): Advice {
  return { startScore: result.finalScore, finalScore: result.finalScore, decisions: result.decisions, steps: [], evaluatedScenarios: 0 };
}

describe("decisionNarrative", () => {
  it("builds a concise impact preview for a social measure", () => {
    const preview = buildImpactPreview({
      id: "M7",
      name: "Школа + детсад",
      category: "social",
      cost: 24,
      lag: 3,
      scope: "district",
      effects: { S1: 16, S2: 5 },
    }, "nura");

    expect(preview.headline).toContain("Школа + детсад");
    expect(preview.summary).toMatch(/S1|S2/);
    expect(preview.summary).toContain("Нура");
  });

  it("explains opportunity cost for a large transport investment", () => {
    const summary = buildOpportunityCostMessage({
      measureName: "ЛРТ / расширение",
      cost: 30,
      lag: 4,
      budget: 100,
      blockedMeasures: ["Выделенные полосы для автобусов"],
    });

    expect(summary).toContain("30%");
    expect(summary).toContain("через 4 квартала");
    expect(summary).toContain("недоступен");
  });

  it("previews the horizon effect instead of the full effect", () => {
    const school = buildImpactPreview(MEASURES_BY_ID.M7, "nura");
    expect(school.metrics).toContainEqual({ key: "S1", label: "Школы", value: 10, fullValue: 16 });
    expect(school.summary).toContain("S1 +10.000");
    expect(school.summary).toContain("62.5%");
    const rail = buildImpactPreview(MEASURES_BY_ID.M3, "esil");
    expect(rail.metrics.map((metric) => [metric.key, metric.value])).toEqual([["T2", 10], ["T1", 8], ["E2", 2]]);
  });

  it("includes negative side effects and applies city effects to every district", () => {
    const crossing = buildImpactPreview(MEASURES_BY_ID.M11, "esil");
    expect(crossing.metrics.find((metric) => metric.key === "T1")?.value).toBe(-1.75);
    expect(crossing.summary).toContain("T1 −1.750");
    const service = buildImpactPreview(MEASURES_BY_ID.M12);
    expect(service.summary).toContain("каждом из 5 районов");
    expect(service.metrics[0].value).toBe(4.375);
    expect(buildImpactPreview(MEASURES_BY_ID.M7).summary).toContain("выбранном районе");
  });

  it("changes conclusions when social measures and synergies are absent", () => {
    const control = simulateDecisions(CONTROL_SCENARIO);
    const alternative = simulateDecisions(withoutSocial);
    const controlText = buildScenarioNarrative(control, noAdvice(control), 100).facts.join(" ");
    const alternativeText = buildScenarioNarrative(alternative, noAdvice(alternative), 100).facts.join(" ");
    expect(controlText).toContain("Закрыто критических значений: 2; осталось: 0");
    expect(controlText).toContain("M10 + M12 (Нура, B1 +2)");
    expect(alternativeText).toContain("Закрыто критических значений: 0; осталось: 2");
    expect(alternativeText).toContain("Синергии в выбранном наборе не сработали");
    expect(alternativeText).not.toContain("M10 + M12");
    const social = buildCategoryOverview(alternative).find((item) => item.title === "Социальная сфера");
    expect(social?.text).toContain("Прямые меры направления не выбраны");
    expect(social?.text).toContain("Школы 0.000; Медицина 0.000");
    expect(social?.text).toContain("Критических значений после решений: 2");
  });

  it("reports the actual budget and does not claim an unperformed optimization", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    const text = buildScenarioNarrative(result, noAdvice(result), 97);
    expect(text.summary).toContain("95 из 97 усл. ед.; остаток 2");
    expect(text.tradeoff).toBe("Поиск замен ещё не проводился.");
  });
});
