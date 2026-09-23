import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// Run after npm run build. A private database and an OS-assigned port keep this
// check separate from the developer's running app and real accounts.
const directory = await mkdtemp(path.join(tmpdir(), "akim-auth-http-"));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "0"], {
  env: { ...process.env, AUTH_DATABASE_PATH: path.join(directory, "auth.sqlite") },
  stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
});
let output = "";
server.stdout.on("data", (chunk) => { output += chunk; });
server.stderr.on("data", (chunk) => { output += chunk; });
let cookie = "";

try {
  let base;
  for (let attempt = 0; attempt < 100; attempt++) {
    base = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (base && output.includes("Ready")) break;
    if (server.exitCode !== null) throw new Error(output);
    await delay(200);
  }
  assert.ok(base && output.includes("Ready"), `Server did not start: ${output}`);
  async function request(url, method = "GET", body, origin = base) {
    return fetch(`${base}${url}`, {
      method, redirect: "manual", headers: {
        ...(method !== "GET" ? { Origin: origin, "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      }, body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  for (const url of ["/", "/login", "/register", "/simulator"]) {
    assert.equal((await request(url)).status, 200, url);
  }
  assert.equal((await request("/profile")).headers.get("location"), "/login");
  assert.equal((await request("/api/profile", "PATCH", { displayName: "Guest", bio: "" })).status, 401);
  assert.equal((await request("/api/auth/register", "POST", {}, "https://other.example")).status, 403);
  const credentials = { login: "http_check_user", password: "a private test password", displayName: "Проверка" };
  const registration = await request("/api/auth/register", "POST", credentials);
  assert.equal(registration.status, 201);
  assert.match(registration.headers.get("set-cookie"), /HttpOnly/);
  cookie = registration.headers.get("set-cookie").split(";")[0];
  const created = (await registration.json()).user;
  assert.equal(created.displayName, "Проверка");
  assert.equal(created.password, undefined);
  assert.equal((await request("/profile")).status, 200);
  assert.equal((await request("/login")).headers.get("location"), "/profile");
  assert.equal((await request("/api/auth/register", "POST", credentials)).status, 409);
  const save = await request("/api/profile", "PATCH", { displayName: "Новое имя", bio: "Мой город — Астана" });
  assert.equal(save.status, 200);
  assert.equal((await save.json()).user.bio, "Мой город — Астана");
  assert.equal((await (await request("/api/profile")).json()).user.displayName, "Новое имя");
  assert.equal((await request("/api/auth/logout", "POST")).status, 200);
  assert.equal((await (await request("/api/profile")).json()).user, null);
  assert.equal((await request("/profile")).headers.get("location"), "/login");
  cookie = "";
  assert.equal((await request("/api/auth/login", "POST", { ...credentials, password: "wrong" })).status, 401);
  const login = await request("/api/auth/login", "POST", credentials);
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  assert.equal((await (await request("/api/profile")).json()).user.bio, "Мой город — Астана");
  console.log("HTTP checks passed: pages, redirects, CSRF, registration, duplicates, profile persistence, logout, login.");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
  assert.ok(path.basename(resolved).startsWith("akim-auth-http-"));
  await rm(resolved, { recursive: true, force: true });
}
