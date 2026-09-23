import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// This checks the production HTTP boundary against the supplied dataset, without
// a paid LLM or the developer's database. Run after npm run build.
const directory = await mkdtemp(path.join(tmpdir(), "akim-model-http-"));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "0"], {
  env: { ...process.env, AUTH_DATABASE_PATH: path.join(directory, "auth.sqlite"), OPENAI_API_KEY: "" },
  stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
});
let output = "";
let startupError;
server.on("error", (error) => { startupError = error; });
server.stdout.on("data", (chunk) => { output += chunk; });
server.stderr.on("data", (chunk) => { output += chunk; });

const control = [
  { measureId: "M7", scope: "district", districtId: "nura" },
  { measureId: "M8", scope: "district", districtId: "nura" },
  { measureId: "M10", scope: "district", districtId: "nura" },
  { measureId: "M12", scope: "city" },
  { measureId: "M5", scope: "district", districtId: "saryarka" },
];

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

try {
  let base;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startupError) throw startupError;
    base = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (base && output.includes("Ready")) break;
    if (server.exitCode !== null) throw new Error(output);
    await delay(200);
  }
  assert.ok(base && output.includes("Ready"), `Server did not start: ${output}`);
  async function post(route, body, expectedStatus = 200) {
    const response = await fetch(`${base}${route}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(60_000),
    });
    const payload = await response.json();
    assert.equal(response.status, expectedStatus, `${route}: ${JSON.stringify(payload)}`);
    if (expectedStatus >= 400) {
      assert.equal(payload.ok, false);
      assert.equal(payload.result, undefined, "An invalid plan must not receive a score");
    } else {
      assert.equal(payload.ok, true);
    }
    return payload;
  }

  const { result } = await post("/api/simulate", { decisions: control });
  near(result.scoreBefore.finalScore, 52.55768);
  near(result.finalScore, 56.54307);
  near(result.scoreDelta, 3.98539);
  assert.equal(result.totalCost, 95);
  assert.equal(result.remainingBudget, 5);
  assert.equal(result.scoreBefore.criticalCount, 2);
  assert.equal(result.scoreAfter.criticalCount, 0);
  assert.equal(result.activatedSynergies.length, 1);
  assert.equal(result.activatedSynergies[0].id, "M10_M12");
  assert.equal(result.activatedSynergies[0].districtId, "nura");

  const reversed = await post("/api/simulate", { decisions: [...control].reverse() });
  near(reversed.result.finalScore, result.finalScore);
  const changed = control.map((decision, index) => index === 0 ? { ...decision, districtId: "esil" } : decision);
  const alternative = await post("/api/simulate", { decisions: changed });
  assert.notEqual(alternative.result.finalScore, result.finalScore);
  assert.equal(alternative.result.scoreAfter.criticalCount, 1);

  await post("/api/simulate", { decisions: control.slice(0, 4) }, 422);
  await post("/api/simulate", { decisions: [...control.slice(0, 4), control[0]] }, 422);
  await post("/api/simulate", { decisions: control, budget: 150 }, 400);
  await post("/api/simulate", {
    decisions: control.map((decision) => decision.scope === "city" ? { ...decision, districtId: "nura" } : decision),
  }, 400);
  await post("/api/simulate", {
    decisions: [
      { measureId: "M3", scope: "district", districtId: "nura" },
      { measureId: "M5", scope: "district", districtId: "saryarka" },
      { measureId: "M7", scope: "district", districtId: "nura" },
      { measureId: "M10", scope: "district", districtId: "nura" },
      { measureId: "M13", scope: "district", districtId: "esil" },
    ],
  }, 422);
  await post("/api/simulate", { decisions: control, eventId: "heating_main" }, 422);
  await post("/api/simulate", { decisions: control, eventId: "unknown-event" }, 400);

  const analysis = await post("/api/analyze", { decisions: control });
  assert.equal(analysis.source, "local", "The no-key path must be explicitly marked local");
  assert.ok(analysis.analysis.summary.length > 0);
  assert.equal(analysis.analysis.districtInsights.length, 5);
  await post("/api/analyze", { decisions: control, finalScore: 100 }, 400);

  const optimized = await post("/api/optimize", { eventId: "heating_main" });
  const best = optimized.result.bestScenario;
  assert.ok(best.totalCost <= 92);
  assert.equal(best.remainingBudget, 92 - best.totalCost);
  const verified = await post("/api/simulate", { decisions: best.decisions, eventId: "heating_main" });
  near(verified.result.finalScore, best.finalScore);
  assert.equal(verified.result.remainingBudget, best.remainingBudget);
  console.log("Model HTTP checks passed: exact baseline/control, order independence, changed choices, invalid plans, fixed budget, event reserve, optimizer parity, honest local analysis.");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (server.pid && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
  assert.ok(path.basename(resolved).startsWith("akim-model-http-"));
  await rm(resolved, { recursive: true, force: true });
}
