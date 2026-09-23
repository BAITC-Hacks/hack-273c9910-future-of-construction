import { describe, expect, it } from "vitest";
import { validateDecisions } from "@/engine/validator";
import type { Decision } from "@/domain/types";

const control: Decision[] = [
  { measureId: "M7", scope: "district", districtId: "nura" },
  { measureId: "M8", scope: "district", districtId: "nura" },
  { measureId: "M10", scope: "district", districtId: "nura" },
  { measureId: "M12", scope: "city" },
  { measureId: "M5", scope: "district", districtId: "saryarka" },
];

describe("validateDecisions", () => {
  it("accepts the control scenario", () => {
    expect(validateDecisions(control)).toEqual({ ok: true });
  });

  it("rejects a count other than 5 in final mode", () => {
    const result = validateDecisions(control.slice(0, 3), "final");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("DECISION_COUNT");
    }
  });

  it("allows incomplete sets in partial mode", () => {
    expect(validateDecisions(control.slice(0, 2), "partial")).toEqual({ ok: true });
  });

  it("rejects duplicate measures", () => {
    const result = validateDecisions(
      [
        { measureId: "M9", scope: "district", districtId: "nura" },
        { measureId: "M9", scope: "district", districtId: "esil" },
        { measureId: "M12", scope: "city" },
        { measureId: "M10", scope: "district", districtId: "almaty" },
        { measureId: "M11", scope: "district", districtId: "baikonyr" },
      ],
      "final",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "DUPLICATE_MEASURE")).toBe(true);
    }
  });

  it("rejects M1 and M3 together", () => {
    const result = validateDecisions([
      { measureId: "M1", scope: "district", districtId: "esil" },
      { measureId: "M3", scope: "district", districtId: "nura" },
      { measureId: "M9", scope: "district", districtId: "almaty" },
      { measureId: "M10", scope: "district", districtId: "baikonyr" },
      { measureId: "M12", scope: "city" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "INCOMPATIBLE_GLOBAL")).toBe(true);
    }
  });

  it("rejects M4 and M7 in the same district", () => {
    const result = validateDecisions([
      { measureId: "M4", scope: "district", districtId: "nura" },
      { measureId: "M7", scope: "district", districtId: "nura" },
      { measureId: "M10", scope: "district", districtId: "esil" },
      { measureId: "M12", scope: "city" },
      { measureId: "M9", scope: "district", districtId: "almaty" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "INCOMPATIBLE_DISTRICT")).toBe(true);
    }
  });

  it("allows M4 and M7 in different districts", () => {
    const result = validateDecisions([
      { measureId: "M4", scope: "district", districtId: "esil" },
      { measureId: "M7", scope: "district", districtId: "nura" },
      { measureId: "M10", scope: "district", districtId: "almaty" },
      { measureId: "M12", scope: "city" },
      { measureId: "M9", scope: "district", districtId: "saryarka" },
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects more than two measures of the same category", () => {
    const result = validateDecisions([
      { measureId: "M7", scope: "district", districtId: "nura" },
      { measureId: "M8", scope: "district", districtId: "esil" },
      { measureId: "M9", scope: "district", districtId: "almaty" },
      { measureId: "M10", scope: "district", districtId: "saryarka" },
      { measureId: "M12", scope: "city" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "CATEGORY_LIMIT")).toBe(true);
    }
  });

  it("rejects a budget over 100", () => {
    const result = validateDecisions([
      { measureId: "M3", scope: "district", districtId: "nura" },
      { measureId: "M5", scope: "district", districtId: "saryarka" },
      { measureId: "M7", scope: "district", districtId: "esil" },
      { measureId: "M13", scope: "district", districtId: "almaty" },
      { measureId: "M2", scope: "city" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "BUDGET")).toBe(true);
    }
  });

  it("rejects a city measure with a district assignment via scope mismatch", () => {
    const result = validateDecisions(
      [{ measureId: "M12", scope: "district", districtId: "nura" } as Decision],
      "partial",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "SCOPE_MISMATCH")).toBe(true);
    }
  });
});
