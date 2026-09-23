import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { AuthStore, SESSION_SECONDS } from "@/lib/auth-store";
import { assertSameOrigin, authFailure, readAuthBody, setSessionCookie, authResponse } from "@/lib/auth-http";

const registration = { login: "Astana_User", password: "correct horse battery", displayName: "Аким" };
let store: AuthStore;
beforeEach(() => { store = new AuthStore(":memory:"); });
afterEach(() => { store.close(); vi.restoreAllMocks(); });

describe("accounts", () => {
  it("registers, normalizes the login, logs in again and never exposes password fields", async () => {
    const created = await store.register(registration);
    expect(created.user.login).toBe("astana_user");
    expect(store.getUser(created.token)).toEqual(created.user);
    expect(Object.getPrototypeOf(store.getUser(created.token))).toBe(Object.prototype);
    const loggedIn = await store.login({ login: " ASTANA_USER ", password: registration.password });
    expect(loggedIn.user).toEqual(created.user);
    expect(loggedIn.token).not.toBe(created.token);
    expect(Object.keys(loggedIn.user).sort()).toEqual(["bio", "createdAt", "displayName", "id", "login"]);
  });

  it("rejects duplicate logins, including simultaneous registrations", async () => {
    const results = await Promise.allSettled([store.register(registration), store.register({ ...registration, login: "astana_user" })]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { status: 409 } });
  });

  it("returns the same error for a wrong password and an unknown account", async () => {
    await store.register(registration);
    for (const input of [{ login: registration.login, password: "wrong" }, { login: "unknown_user", password: "wrong" }]) {
      await expect(store.login(input)).rejects.toMatchObject({ status: 401, message: "Неверный логин или пароль." });
    }
  });

  it("rejects invalid registrations before creating a session", async () => {
    for (const input of [
      { ...registration, password: "short" },
      { ...registration, login: "../user" },
      { ...registration, displayName: "   " },
      { ...registration, password: "x".repeat(129) },
    ]) await expect(store.register(input)).rejects.toThrow();
  });

  it("only updates the profile belonging to the session", async () => {
    const first = await store.register(registration);
    const second = await store.register({ ...registration, login: "another_user" });
    const updated = store.updateProfile(first.token, { displayName: "  Влад  ", bio: "  Люблю Астану  ", id: second.user.id, login: "another_user" });
    expect(updated).toMatchObject({ id: first.user.id, login: first.user.login, displayName: "Влад", bio: "Люблю Астану" });
    expect(store.getUser(second.token)).toEqual(second.user);
    expect(() => store.updateProfile(undefined, { displayName: "Чужой", bio: "" })).toThrow();
    expect(() => store.updateProfile(first.token, { displayName: "", bio: "" })).toThrow();
  });

  it("revokes sessions on logout and rejects expired or forged tokens", async () => {
    const { token } = await store.register(registration);
    expect(store.getUser("0".repeat(64))).toBeNull();
    expect(store.getUser("' OR 1=1 --")).toBeNull();
    store.logout(token);
    expect(store.getUser(token)).toBeNull();
    const session = await store.login(registration);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + SESSION_SECONDS * 1000 + 1);
    expect(store.getUser(session.token)).toBeNull();
  });

  it("limits repeated authentication attempts and permits retry after the window", async () => {
    // A nonexistent login exercises exactly the same limiter as an existing account.
    for (let attempt = 0; attempt < 10; attempt++) {
      await expect(store.login({ login: "unknown", password: "wrong" })).rejects.toMatchObject({ status: 401 });
    }
    await expect(store.login({ login: "UNKNOWN", password: "wrong" })).rejects.toMatchObject({ status: 429 });
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 15 * 60 * 1000 + 1);
    await expect(store.login({ login: "unknown", password: "wrong" })).rejects.toMatchObject({ status: 401 });
  });

  it("persists accounts and sessions across reopening the database without plaintext secrets", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "akim-auth-test-"));
    const filename = path.join(directory, "auth.sqlite");
    let diskStore = new AuthStore(filename);
    try {
      const { token, user } = await diskStore.register(registration);
      diskStore.close();
      const raw = readFileSync(filename).toString("utf8");
      expect(raw).not.toContain(registration.password);
      expect(raw).not.toContain(token);
      diskStore = new AuthStore(filename);
      expect(diskStore.getUser(token)).toEqual(user);
      expect((await diskStore.login(registration)).user).toEqual(user);
    } finally {
      diskStore.close();
      if (path.dirname(directory) === path.resolve(tmpdir()) && path.basename(directory).startsWith("akim-auth-test-")) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });
});

describe("authentication HTTP boundaries", () => {
  function request(body: string, origin = "http://localhost:3000") {
    return new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST", headers: { origin, "Content-Type": "application/json" }, body,
    });
  }

  it("rejects cross-origin and missing-origin writes", () => {
    expect(() => assertSameOrigin(request("{}", "https://other.example"))).toThrow();
    expect(() => assertSameOrigin(request("{}", ""))).toThrow();
    expect(() => assertSameOrigin(request("{}"))).not.toThrow();
  });

  it("rejects malformed and oversized bodies", async () => {
    await expect(readAuthBody(request("{"))).rejects.toMatchObject({ status: 400 });
    await expect(readAuthBody(request(JSON.stringify({ bio: "x".repeat(9000) })))).rejects.toMatchObject({ status: 413 });
    await expect(readAuthBody(request('{"login":"user"}'))).resolves.toEqual({ login: "user" });
  });

  it("uses the browser-facing host when Next uses an internal listening address", () => {
    const proxied = new NextRequest("http://127.0.0.1:0/api/profile", {
      method: "PATCH", headers: { host: "localhost:3000", origin: "http://localhost:3000" },
    });
    expect(() => assertSameOrigin(proxied)).not.toThrow();
  });

  it("uses private cookies, secure cookies on HTTPS and no-store responses", () => {
    const response = authResponse({ ok: true });
    setSessionCookie(response, "abc", new NextRequest("https://example.com/api/auth/login"));
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
    expect(response.headers.get("cache-control")).toBe("no-store");
    setSessionCookie(response, "", request("{}"));
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("does not expose internal errors", async () => {
    const response = authFailure(new Error("secret database path"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret database path");
  });
});
