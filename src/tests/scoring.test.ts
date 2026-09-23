import { describe, expect, it } from "vitest";
import { EXPECTED_BASELINE_SCORE, INDICATOR_WEIGHTS } from "@/domain/constants";
import { baselineScore, districtScore, scoreCity } from "@/engine/scoring";
import { DISTRICTS } from "@/data/districts";

describe("scoring", () => {
  it("uses weights that sum to 1", () => {
    const sum = Object.values(INDICATOR_WEIGHTS).reduce((acc, value) => acc + value, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("matches the published baseline score of approximately 52.56", () => {
    const baseline = baselineScore();
    expect(baseline.finalScore).toBeCloseTo(EXPECTED_BASELINE_SCORE, 1);
    expect(baseline.criticalCount).toBe(2);
    expect(baseline.weakestDistrictId).toBe("nura");
  });

  it("identifies Nura S1 and S2 as the only baseline critical indicators", () => {
    const baseline = baselineScore();
    const keys = baseline.criticalIndicators.map(
      (item) => `${item.districtId}:${item.indicator}`,
    );
    expect(keys.sort()).toEqual(["nura:S1", "nura:S2"]);
  });

  it("computes a population-weighted city average", () => {
    const scored = scoreCity(DISTRICTS);
    const manual = DISTRICTS.reduce(
      (sum, district) => sum + district.populationShare * districtScore(district.indicators),
      0,
    );
    expect(scored.cityAverage).toBeCloseTo(manual, 10);
  });
});
