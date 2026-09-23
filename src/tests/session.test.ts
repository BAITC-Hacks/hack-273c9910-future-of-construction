import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_KEY, RESULT_KEY, loadResult, loadResultEventId, saveResult, saveSessionValue } from "@/lib/session";
import { simulateDecisions } from "@/engine/simulation";
import { CONTROL_SCENARIO } from "./fixtures";

const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("saved result context", () => {
  it("keeps the result budget independent of the next game's event", () => {
    saveResult(simulateDecisions(CONTROL_SCENARIO));
    saveSessionValue(EVENT_KEY, { id: "heating_main", reserve: 8 });
    expect(loadResultEventId()).toBeNull();
    expect(loadResult()?.remainingBudget).toBe(5);
  });

  it("recalculates a stored score instead of trusting modified browser data", () => {
    saveResult({ ...simulateDecisions(CONTROL_SCENARIO), finalScore: 9999 });
    expect(loadResult()?.finalScore).toBeCloseTo(56.54307, 8);
  });

  it("refuses malformed and invalid event snapshots", () => {
    storage.set(RESULT_KEY, "{");
    expect(loadResult()).toBeNull();
    storage.set(RESULT_KEY, JSON.stringify({ decisions: CONTROL_SCENARIO, eventId: "invented" }));
    expect(loadResult()).toBeNull();
    storage.set(RESULT_KEY, JSON.stringify({ decisions: CONTROL_SCENARIO, eventId: "heating_main" }));
    expect(loadResult()).toBeNull();
  });

  it("does not interrupt a simulation when storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", { setItem: () => { throw new DOMException("Disabled"); } });
    expect(() => saveResult(simulateDecisions(CONTROL_SCENARIO))).not.toThrow();
  });
});
