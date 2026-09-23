import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/simulate/route";
import { CITY_EVENTS, getScenarioBudget } from "@/data/events";
import type { Decision } from "@/domain/types";
import { optimizeRequestSchema, simulateRequestSchema } from "@/lib/schemas";
import { CONTROL_SCENARIO } from "./fixtures";

const economical: Decision[] = [
  { measureId: "M9", scope: "district", districtId: "nura" },
  { measureId: "M11", scope: "district", districtId: "nura" },
  { measureId: "M10", scope: "district", districtId: "nura" },
  { measureId: "M12", scope: "city" },
  { measureId: "M4", scope: "district", districtId: "saryarka" },
];

function request(body: unknown): Request {
  return new Request("http://localhost/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("scenario request contract", () => {
  it("uses 100 without an event and refuses an unknown event", () => {
    expect(getScenarioBudget()).toBe(100);
    expect(getScenarioBudget(null)).toBe(100);
    expect(() => getScenarioBudget("invented")).toThrow("Неизвестное");
  });

  it.each(CITY_EVENTS)("derives $id reserve from the server catalog", async (event) => {
    const budget = 100 - event.reserve;
    expect(getScenarioBudget(event.id)).toBe(budget);
    const response = await POST(request({ decisions: economical, eventId: event.id }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.totalCost).toBe(61);
    expect(body.result.remainingBudget).toBe(budget - 61);

    const overBudget = await POST(request({ decisions: CONTROL_SCENARIO, eventId: event.id }));
    expect(overBudget.status).toBe(422);
    expect((await overBudget.json()).errors.map((error: { code: string }) => error.code)).toContain("BUDGET");
  });

  it.each([undefined, null])("keeps the default API budget for event %s", async (eventId) => {
    const response = await POST(request({ decisions: CONTROL_SCENARIO, eventId }));
    expect(response.status).toBe(200);
    expect((await response.json()).result.remainingBudget).toBe(5);
  });

  it("rejects city districtId instead of stripping it", async () => {
    const decisions = CONTROL_SCENARIO.map((decision) =>
      decision.scope === "city" ? { ...decision, districtId: "nura" } : decision,
    );
    expect(simulateRequestSchema.safeParse({ decisions }).success).toBe(false);
    expect((await POST(request({ decisions }))).status).toBe(400);
  });

  it("rejects client budgets, unknown events and extra decision fields", async () => {
    for (const body of [
      { decisions: CONTROL_SCENARIO, budget: 500 },
      { decisions: CONTROL_SCENARIO, eventId: "invented" },
      { decisions: CONTROL_SCENARIO.map((decision) => ({ ...decision, cost: 0 })) },
      { decisions: [...CONTROL_SCENARIO, economical[0]] },
    ]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect(optimizeRequestSchema.safeParse({ budget: 500 }).success).toBe(false);
    expect(optimizeRequestSchema.safeParse({ eventId: "invented" }).success).toBe(false);
    expect(optimizeRequestSchema.safeParse({ eventId: "storm", reserve: 0 }).success).toBe(false);
  });

  it("rejects incomplete scenarios and malformed JSON without producing a score", async () => {
    const response = await POST(request({ decisions: economical.slice(0, 4) }));
    expect(response.status).toBe(422);
    expect((await response.json()).result).toBeUndefined();
    const malformed = await POST(new Request("http://localhost/api/simulate", { method: "POST", body: "{" }));
    expect(malformed.status).toBe(400);
  });
});
