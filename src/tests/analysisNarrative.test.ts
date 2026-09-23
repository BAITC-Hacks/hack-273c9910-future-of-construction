import { describe, expect, it } from "vitest";
import { buildLocalAnalysis } from "@/ai/localAnalyst";
import type { Decision, SimulationResult } from "@/domain/types";
import type { Advice } from "@/engine/advisor";
import { simulateDecisions } from "@/engine/simulation";
import { buildReportMarkdown } from "@/lib/report";
import { CONTROL_SCENARIO } from "./fixtures";

function noAdvice(result: SimulationResult): Advice {
  return { startScore: result.finalScore, finalScore: result.finalScore, decisions: result.decisions, steps: [], evaluatedScenarios: 0 };
}

describe("analysis narratives", () => {
  it("does not claim missing-category indicators are unchanged when another measure affects them", () => {
    const decisions: Decision[] = [
      { measureId: "M2", scope: "city" },
      { measureId: "M4", scope: "district", districtId: "esil" },
      { measureId: "M7", scope: "district", districtId: "nura" },
      { measureId: "M8", scope: "district", districtId: "nura" },
      { measureId: "M12", scope: "city" },
    ];
    const result = simulateDecisions(decisions);
    const analysis = buildLocalAnalysis({ result, advice: noAdvice(result), budget: 100 });
    expect(result.comparisons[0].delta.B2).toBeGreaterThan(0);
    expect(analysis.risks.join(" ")).toContain("Прямые меры не выбраны в направлениях: Безопасность");
    expect(analysis.risks.join(" ")).not.toContain("Их показатели не изменятся");
    expect(analysis.synergyExplanation).toEqual([]);
    expect(analysis.recommendations.join(" ")).not.toContain("Добавив");
  });

  it("does not invent city measures in untouched districts", () => {
    const result = simulateDecisions([
      { measureId: "M1", scope: "district", districtId: "esil" },
      { measureId: "M4", scope: "district", districtId: "almaty" },
      { measureId: "M7", scope: "district", districtId: "nura" },
      { measureId: "M10", scope: "district", districtId: "esil" },
      { measureId: "M11", scope: "district", districtId: "esil" },
    ]);
    const analysis = buildLocalAnalysis({ result, advice: noAdvice(result), budget: 100 });
    expect(analysis.districtInsights.find((item) => item.districtId === "saryarka")?.text).toContain("Для района не выбраны меры");
    expect(analysis.synergyExplanation).toEqual([]);
  });

  it("reports actual synergy placement, horizon factors and budget units", () => {
    const result = simulateDecisions(CONTROL_SCENARIO);
    const advice = noAdvice(result);
    const analysis = buildLocalAnalysis({ result, advice, budget: 97 });
    expect(analysis.synergyExplanation).toHaveLength(1);
    expect(analysis.synergyExplanation[0]).toContain("B1 +2 в районе Нура");
    expect(analysis.risks.join(" ")).toContain("62.5% полного эффекта");
    const report = buildReportMarkdown({ team: "Тест", result, analysis, analysisSource: "local", advice, budget: 97, event: null });
    expect(report).toContain("95 из 97 усл. ед. · Остаток: 2 усл. ед.");
    expect(report).toContain("62.5%");
    expect(report).toContain("без LLM");
    expect(report).not.toMatch(/₸|млрд/);
    expect(analysis.summary).not.toMatch(/₸|млрд/);
  });
});
