export const TENGE_PER_UNIT = 1_000_000_000;

export function formatTenge(units: number): string {
  return `${formatUnits(units)} млрд ₸`;
}

export function formatUnits(units: number): string {
  return Number.isInteger(units) ? String(units) : units.toFixed(1);
}

export function formatTengeFull(units: number): string {
  return `${Math.round(units * TENGE_PER_UNIT).toLocaleString("ru-RU")} ₸`;
}
