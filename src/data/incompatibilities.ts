import type { DistrictId, MeasureId } from "@/domain/types";

export type GlobalIncompatibility = {
  measureIds: [MeasureId, MeasureId];
  message: string;
};

export type SameDistrictIncompatibility = {
  measureIds: [MeasureId, MeasureId];
  message: (districtName: string) => string;
};

export const GLOBAL_INCOMPATIBILITIES: GlobalIncompatibility[] = [
  {
    measureIds: ["M1", "M3"],
    message:
      "Нельзя одновременно выбирать «Выделенные полосы для автобусов» (M1) и «Линия ЛРТ / расширение» (M3).",
  },
];

export const SAME_DISTRICT_INCOMPATIBILITIES: SameDistrictIncompatibility[] = [
  {
    measureIds: ["M4", "M7"],
    message: (districtName) =>
      `«Парк / сквер» (M4) и «Школа + детсад» (M7) нельзя размещать в одном районе (${districtName}).`,
  },
  {
    measureIds: ["M5", "M13"],
    message: (districtName) =>
      `«Перевод частного сектора на чистое топливо» (M5) и «Модернизация тепло- и водосетей» (M13) нельзя размещать в одном районе (${districtName}).`,
  },
];

export function pairKey(a: MeasureId, b: MeasureId): string {
  return [a, b].sort().join("+");
}

export function hasPair(
  selected: Set<MeasureId>,
  a: MeasureId,
  b: MeasureId,
): boolean {
  return selected.has(a) && selected.has(b);
}

export function sameDistrictConflict(
  assignments: Partial<Record<MeasureId, DistrictId>>,
  a: MeasureId,
  b: MeasureId,
): boolean {
  const left = assignments[a];
  const right = assignments[b];
  return Boolean(left && right && left === right);
}
