import type { Decision } from "@/domain/types";
import { REQUIRED_DECISIONS } from "@/domain/constants";
import { z } from "zod";
import { decisionSchema } from "./schemas";

export type LeaderboardEntry = {
  id: string;
  team: string;
  score: number;
  delta: number;
  spent: number;
  budget: number;
  eventTitle: string | null;
  decisions: Decision[];
  createdAt: string;
};

const LEADERBOARD_KEY = "akim-leaderboard";
const TEAM_KEY = "akim-team";
const MAX_ENTRIES = 20;
const teamNameSchema = z.string().max(40).refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const leaderboardEntrySchema = z.object({
  id: z.string().min(1).max(100),
  team: teamNameSchema.refine((value) => value.trim().length > 0),
  score: z.number().finite().min(-50).max(100),
  delta: z.number().finite(),
  spent: z.number().finite().nonnegative(),
  budget: z.number().finite().positive(),
  eventTitle: z.string().min(1).max(200).nullable(),
  decisions: z.array(decisionSchema).length(REQUIRED_DECISIONS),
  createdAt: z.string().datetime(),
}).refine((entry) => entry.spent <= entry.budget);

function readStorage(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    // Keep the current result usable when storage is denied or full.
  }
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = readStorage(LEADERBOARD_KEY);
    const stored: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(stored)) return [];
    const entries = stored.flatMap((item) => {
      const parsed = leaderboardEntrySchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
    return entries.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(
  entry: Omit<LeaderboardEntry, "id" | "createdAt">,
): { entries: LeaderboardEntry[]; id: string } {
  const next: LeaderboardEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const entries = [...loadLeaderboard(), next].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  writeStorage(LEADERBOARD_KEY, JSON.stringify(entries));
  return { entries, id: next.id };
}

export function clearLeaderboard(): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(LEADERBOARD_KEY);
  } catch {
    // The caller still clears the in-memory leaderboard.
  }
}

export function loadTeamName(): string {
  const parsed = teamNameSchema.safeParse(readStorage(TEAM_KEY));
  return parsed.success ? parsed.data : "";
}

export function saveTeamName(team: string): void {
  const parsed = teamNameSchema.safeParse(team);
  if (parsed.success) writeStorage(TEAM_KEY, parsed.data);
}
