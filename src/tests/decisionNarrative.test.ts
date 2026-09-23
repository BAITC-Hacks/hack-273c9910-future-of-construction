import { describe, expect, it } from "vitest";
import { buildImpactPreview, buildOpportunityCostMessage } from "@/lib/decisionNarrative";

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
});
