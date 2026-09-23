import { SIMULATION_HORIZON } from "@/domain/constants";

export function realizedFactor(
  lag: number,
  horizon: number = SIMULATION_HORIZON,
): number {
  return (horizon - lag) / horizon;
}

export function realizedEffect(
  fullEffect: number,
  lag: number,
  horizon: number = SIMULATION_HORIZON,
): number {
  return fullEffect * realizedFactor(lag, horizon);
}

export function clip(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function emptyIndicatorTotals(): Record<string, number> {
  return {};
}
