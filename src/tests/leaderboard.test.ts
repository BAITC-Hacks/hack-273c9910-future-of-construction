import { afterEach, describe, expect, it, vi } from "vitest";
import { addLeaderboardEntry, clearLeaderboard, loadLeaderboard, loadTeamName, saveTeamName, type LeaderboardEntry } from "@/lib/leaderboard";
import { CONTROL_SCENARIO } from "./fixtures";

const entry: LeaderboardEntry = {
  id: "test-result",
  team: "Команда",
  score: 56.54307,
  delta: 3.98539,
  spent: 95,
  budget: 100,
  eventTitle: null,
  decisions: CONTROL_SCENARIO,
  createdAt: "2026-09-23T12:00:00.000Z",
};

function mockStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
  vi.stubGlobal("window", { localStorage: storage });
  return storage;
}

afterEach(() => vi.unstubAllGlobals());

describe("local leaderboard persistence", () => {
  it("round-trips a valid result and team name", () => {
    mockStorage();
    const result = addLeaderboardEntry(entry);
    expect(result.id).toBeTruthy();
    expect(loadLeaderboard()).toEqual(result.entries);
    saveTeamName("Новая команда");
    expect(loadTeamName()).toBe("Новая команда");
    clearLeaderboard();
    expect(loadLeaderboard()).toEqual([]);
  });

  it.each(["{", "null", '"text"', '{"score":99}'])("ignores malformed or non-array stored data: %s", (raw) => {
    mockStorage({ "akim-leaderboard": raw });
    expect(loadLeaderboard()).toEqual([]);
  });

  it("keeps valid rows while discarding malformed shapes and non-finite scores", () => {
    const invalidDecision = { measureId: "M99", scope: "city" };
    const raw = JSON.stringify([
      { ...entry, id: "low", score: 54 },
      null,
      { ...entry, score: "99" },
      { ...entry, score: null },
      { ...entry, decisions: [invalidDecision, ...CONTROL_SCENARIO.slice(1)] },
      { ...entry, decisions: CONTROL_SCENARIO.slice(1) },
      { ...entry, createdAt: "not-a-date" },
      { ...entry, spent: 101 },
      { ...entry, team: { name: "bad" } },
      { ...entry, team: "x".repeat(41) },
      entry,
    ]);
    mockStorage({ "akim-leaderboard": raw.replace('"score":null', '"score":1e999') });
    expect(loadLeaderboard().map((item) => item.id)).toEqual(["test-result", "low"]);
  });

  it("retains the current in-memory result when writing fails", () => {
    const storage = mockStorage({ "akim-leaderboard": JSON.stringify([entry]) });
    storage.setItem.mockImplementation(() => { throw new Error("QuotaExceededError"); });
    const result = addLeaderboardEntry({ ...entry, team: "Новая команда" });
    expect(result.id).toBeTruthy();
    expect(result.entries).toHaveLength(2);
    expect(result.entries.find((item) => item.id === result.id)?.team).toBe("Новая команда");
    expect(() => saveTeamName("Тест")).not.toThrow();
  });

  it("handles storage access and deletion errors", () => {
    const storage = mockStorage();
    storage.getItem.mockImplementation(() => { throw new Error("SecurityError"); });
    storage.removeItem.mockImplementation(() => { throw new Error("SecurityError"); });
    expect(loadLeaderboard()).toEqual([]);
    expect(loadTeamName()).toBe("");
    expect(() => clearLeaderboard()).not.toThrow();
    vi.stubGlobal("window", Object.defineProperty({}, "localStorage", {
      get() { throw new Error("SecurityError"); },
    }));
    expect(loadLeaderboard()).toEqual([]);
    expect(loadTeamName()).toBe("");
    expect(addLeaderboardEntry(entry).entries).toHaveLength(1);
    expect(() => clearLeaderboard()).not.toThrow();
    expect(() => saveTeamName("Тест")).not.toThrow();
  });

  it("rejects invalid team names and handles server rendering without window", () => {
    const storage = mockStorage({ "akim-team": "x".repeat(41) });
    expect(loadTeamName()).toBe("");
    saveTeamName("строка\nперенос");
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.stubGlobal("window", undefined);
    expect(loadLeaderboard()).toEqual([]);
    expect(loadTeamName()).toBe("");
    expect(addLeaderboardEntry(entry).entries).toHaveLength(1);
    expect(() => clearLeaderboard()).not.toThrow();
    expect(() => saveTeamName("Тест")).not.toThrow();
  });
});
