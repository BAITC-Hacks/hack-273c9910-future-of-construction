import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatScore(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function formatDelta(value: number, digits = 2): string {
  const formatted = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function formatIndicator(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function indicatorTone(value: number): "critical" | "warn" | "ok" | "strong" {
  if (value < 40) return "critical";
  if (value < 50) return "warn";
  if (value < 70) return "ok";
  return "strong";
}
