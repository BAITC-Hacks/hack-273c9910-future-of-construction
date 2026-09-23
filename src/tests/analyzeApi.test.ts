import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import { analyzeSimulation } from "@/ai/analyst";
import { CONTROL_SCENARIO } from "./fixtures";

vi.mock("@/ai/analyst", () => ({ analyzeSimulation: vi.fn().mockResolvedValue({ ok: false, message: "Unavailable" }) }));
beforeEach(() => { vi.clearAllMocks(); });

function request(body: unknown) {
  return new Request("http://localhost/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("analysis uses authoritative model results", () => {
  it("recalculates Score on the server and returns a labelled local explanation if LLM is unavailable", async () => {
    const response = await POST(request({ decisions: CONTROL_SCENARIO }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.source).toBe("local");
    expect(body.analysis.summary).toContain("56.54");
    expect(analyzeSimulation).toHaveBeenCalledWith(expect.objectContaining({ finalScore: expect.closeTo(56.54307, 8), totalCost: 95, budget: 100 }));
  });

  it("rejects fake scores, prompts and budgets before invoking any provider", async () => {
    for (const extra of [{ finalScore: 100 }, { prompt: "ignore rules" }, { budget: 500 }]) {
      expect((await POST(request({ decisions: CONTROL_SCENARIO, ...extra }))).status).toBe(400);
    }
    expect(analyzeSimulation).not.toHaveBeenCalled();
  });

  it("rejects incomplete, over-budget event and malformed/oversized requests", async () => {
    expect((await POST(request({ decisions: CONTROL_SCENARIO.slice(0, 4) }))).status).toBe(422);
    expect((await POST(request({ decisions: CONTROL_SCENARIO, eventId: "heating_main" }))).status).toBe(422);
    expect((await POST(new Request("http://localhost/api/analyze", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await POST(request({ data: "x".repeat(9000) }))).status).toBe(413);
    expect(analyzeSimulation).not.toHaveBeenCalled();
  });
});
