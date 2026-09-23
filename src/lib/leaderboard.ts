import type { Decision } from "@/domain/types";

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

export function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    const entries = raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
    return entries.sort((a, b) => b.score - a.score);
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
  const entries = [...loadLeaderboard(), next].sort((a, b) => b.score - a.score).slice(0, 20);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  return { entries, id: next.id };
}

export function clearLeaderboard(): void {
  localStorage.removeItem(LEADERBOARD_KEY);
}

export function loadTeamName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TEAM_KEY) ?? "";
}

export function saveTeamName(team: string): void {
  localStorage.setItem(TEAM_KEY, team);
}
