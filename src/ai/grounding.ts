// Reject numbers absent from the engine payload. This does not replace semantic
// evaluation of prose, but catches invented numerical claims before display.
function numbers(text: string): number[] {
  return (text.replace(/−/g, "-").match(/[+-]?\d+(?:[.,]\d+)?/g) ?? [])
    .map((value) => Number(value.replace(",", ".")));
}

export function hasGroundedNumbers(analysis: unknown, payload: unknown): boolean {
  const allowed = new Set<number>();
  function collect(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
      allowed.add(value);
      allowed.add(Number(value.toFixed(8)));
      allowed.add(Number(value.toFixed(1)));
      allowed.add(Number(value.toFixed(2)));
    } else if (typeof value === "string") {
      numbers(value).forEach((number) => allowed.add(number));
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => { collect(key); collect(item); });
    }
  }
  collect(payload);
  function check(value: unknown): boolean {
    if (typeof value === "string") return numbers(value).every((number) => allowed.has(number));
    if (Array.isArray(value)) return value.every(check);
    if (value && typeof value === "object") return Object.values(value).every(check);
    return true;
  }
  return check(analysis);
}
