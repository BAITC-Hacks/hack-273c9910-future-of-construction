import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeSimulation } from "@/ai/analyst";
import { OpenAiCompatibleProvider, type LlmProvider } from "@/ai/provider";
import { hasGroundedNumbers } from "@/ai/grounding";
import { simulateDecisions } from "@/engine/simulation";
import { toAnalyzeDto } from "@/lib/session";
import { runSimulation } from "@/lib/analysisClient";
import { DISTRICT_IDS } from "@/domain/types";
import { CONTROL_SCENARIO } from "./fixtures";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const payload = toAnalyzeDto(simulateDecisions(CONTROL_SCENARIO));
const answer = {
  summary: "Score вырос с 52,56 до 56,54.",
  strengths: ["Закрыты критические показатели Нуры."],
  risks: ["Транспортные меры не выбраны."],
  tradeoffs: ["Приоритет отдан социальной инфраструктуре."],
  recommendations: ["Сравните план с результатом оптимизатора."],
  districtInsights: DISTRICT_IDS.map((districtId) => ({ districtId, text: "Показатели приведены в таблице результата." })),
  synergyExplanation: ["M10 и M12 усиливают безопасность Нуры."],
};
const provider = (content: string): LlmProvider => ({ isConfigured: () => true, complete: vi.fn().mockResolvedValue(content) });

describe("LLM contract and fallback", () => {
  it("passes complete indicator deltas, lag and contributions to the provider", async () => {
    const mock = provider(JSON.stringify(answer));
    const response = await analyzeSimulation(payload, mock);
    expect(response.ok).toBe(true);
    const sent = JSON.parse(vi.mocked(mock.complete).mock.calls[0][0].messages[1].content.split("Structured simulation result:\n")[1]);
    expect(sent.comparisons.find((item: { id: string }) => item.id === "nura")).toMatchObject({ before: { S1: 38 }, after: { S1: 48 }, delta: { S1: 10 } });
    expect(sent.measureContributions[0]).toMatchObject({ lag: 3, realizedFactor: 0.625 });
  });

  it("accepts structured fenced JSON but rejects malformed/empty/duplicate-district replies", async () => {
    expect((await analyzeSimulation(payload, provider("```json\n" + JSON.stringify(answer) + "\n```"))).ok).toBe(true);
    for (const content of ["not JSON", "{}", JSON.stringify({ ...answer, summary: "" }), JSON.stringify({ ...answer, districtInsights: Array(5).fill(answer.districtInsights[0]) })]) {
      expect((await analyzeSimulation(payload, provider(content))).ok).toBe(false);
    }
  });

  it("rejects invented numbers while allowing precise and rounded engine values", async () => {
    expect(hasGroundedNumbers({ text: "52.55768 → 56,54 (+3,99)" }, payload)).toBe(true);
    expect((await analyzeSimulation(payload, provider(JSON.stringify({ ...answer, summary: "Score равен 9999." })))).ok).toBe(false);
  });

  it("handles missing credentials and provider errors without exposing secrets", async () => {
    const missing: LlmProvider = { isConfigured: () => false, complete: vi.fn() };
    expect((await analyzeSimulation(payload, missing)).ok).toBe(false);
    expect(missing.complete).not.toHaveBeenCalled();
    const failing: LlmProvider = { isConfigured: () => true, complete: vi.fn().mockRejectedValue(new Error("private provider response")) };
    const result = await analyzeSimulation(payload, failing);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private");
  });
});

describe("provider time and response boundaries", () => {
  it("sets an abort deadline and rejects truncated responses", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: JSON.stringify(answer) } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const client = new OpenAiCompatibleProvider("test-only", "https://example.invalid/v1", "test-model");
    await expect(client.complete({ messages: [] })).rejects.toThrow();
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    const request = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(request.response_format).toEqual({ type: "json_object" });
    expect(request.max_completion_tokens).toBe(1800);
  });

  it("aborts a stalled provider request", async () => {
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
    })));
    const client = new OpenAiCompatibleProvider("test-only", "https://example.invalid/v1", "test-model", 15);
    await expect(client.complete({ messages: [] })).rejects.toThrow();
  });
});

describe("browser/server calculation boundary", () => {
  it("does not silently replace a server rejection with a browser result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ errors: [{ message: "Недопустимый сценарий" }] }), { status: 422 })));
    await expect(runSimulation(CONTROL_SCENARIO)).rejects.toThrow("Недопустимый");
  });

  it("calculates a valid fallback offline and still enforces the event reserve", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const offline = await runSimulation(CONTROL_SCENARIO);
    expect(offline.source).toBe("browser");
    expect(offline.result.finalScore).toBeCloseTo(56.54307, 8);
    await expect(runSimulation(CONTROL_SCENARIO, "heating_main")).rejects.toThrow("Бюджет превышен");
  });
});
