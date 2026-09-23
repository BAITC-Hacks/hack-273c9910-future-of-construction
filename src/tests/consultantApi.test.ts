import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/consultant/route";
import { defaultProvider } from "@/ai/provider";
import { CONTROL_SCENARIO } from "./fixtures";

afterEach(() => vi.restoreAllMocks());
const body = { message: "Сколько осталось бюджета?", decisions: [] };
const request = (data: unknown) => new Request("http://localhost/api/consultant", { method: "POST", body: JSON.stringify(data) });

describe("consultant HTTP boundary", () => {
  it("answers incomplete plans without a key and explains event overrun", async () => {
    vi.spyOn(defaultProvider, "isConfigured").mockReturnValue(false);
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ source: "local", message: expect.stringContaining("100 из 100") });
    const overrun = await POST(request({ ...body, decisions: CONTROL_SCENARIO, eventId: "heating_main" }));
    expect(overrun.status).toBe(200);
    expect(await overrun.json()).toMatchObject({ message: expect.stringContaining("Бюджет превышен") });
  });

  it("rejects invalid decisions, forged scores, oversized and malformed bodies before AI", async () => {
    const spy = vi.spyOn(defaultProvider, "complete");
    expect((await POST(request({ ...body, finalScore: 100 }))).status).toBe(400);
    expect((await POST(request({ ...body, decisions: [{ measureId: "M1", scope: "city" }] }))).status).toBe(422);
    expect((await POST(request({ ...body, message: "x".repeat(9000) }))).status).toBe(413);
    expect((await POST(new Request("http://localhost/api/consultant", { method: "POST", body: "{" }))).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
});
