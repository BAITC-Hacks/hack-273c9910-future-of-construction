export function formatBudget(units: number): string {
  return `${formatUnits(units)} усл. ед.`;
}

export function formatUnits(units: number): string {
  return Number.isInteger(units) ? String(units) : units.toFixed(1);
}
