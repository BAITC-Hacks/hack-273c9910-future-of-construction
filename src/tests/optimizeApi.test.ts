import { describe, expect, it, vi } from "vitest";
import { CITY_EVENTS } from "@/data/events";
import { optimizeScenarios } from "@/engine/optimizer";
import { GET, POST } from "@/app/api/optimize/route";

vi.mock("@/engine/optimizer", () => ({
  optimizeScenarios: vi.fn((budget: number) => ({
    bestScenario: { remainingBudget: budget - 61 },
    alternatives: [],
    score: 55,
  })),
}));

function request(body: unknown): Request {
  return new Request("http://localhost/api/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("server optimization endpoint", () => {
  it("shares the default cache across GET, empty POST and null event; caches each event budget", async () => {
    const responses = [await GET(), await POST(request({})), await POST(request({ eventId: null }))];
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect((await response.json()).result.bestScenario.remainingBudget).toBe(39);
    }
    expect(optimizeScenarios).toHaveBeenCalledTimes(1);
    expect(optimizeScenarios).toHaveBeenLastCalledWith(100);

    for (const event of CITY_EVENTS) {
      const response = await POST(request({ eventId: event.id }));
      expect(response.status).toBe(200);
      expect((await response.json()).result.bestScenario.remainingBudget).toBe(100 - event.reserve - 61);
      expect(optimizeScenarios).toHaveBeenLastCalledWith(100 - event.reserve);
      await POST(request({ eventId: event.id }));
    }
    expect(optimizeScenarios).toHaveBeenCalledTimes(CITY_EVENTS.length + 1);
  });

  it("rejects client-supplied budgets, unknown events and malformed JSON before optimization", async () => {
    const callsBefore = vi.mocked(optimizeScenarios).mock.calls.length;
    for (const body of [{ budget: 500 }, { eventId: "invented" }, { eventId: "storm", reserve: 0 }]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    const malformed = await POST(new Request("http://localhost/api/optimize", { method: "POST", body: "{" }));
    expect(malformed.status).toBe(400);
    expect(optimizeScenarios).toHaveBeenCalledTimes(callsBefore);
  });
});
