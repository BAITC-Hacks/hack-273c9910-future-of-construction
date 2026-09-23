import type { Category, IndicatorKey } from "./types";

export const BUDGET = 100;
export const REQUIRED_DECISIONS = 5;
export const SIMULATION_HORIZON = 8;
export const MAX_MEASURES_PER_CATEGORY = 2;
export const CRITICAL_THRESHOLD = 40;

export const INDICATOR_WEIGHTS: Record<IndicatorKey, number> = {
  T1: 0.1,
  T2: 0.1,
  E1: 0.09,
  E2: 0.11,
  S1: 0.11,
  S2: 0.11,
  B1: 0.09,
  B2: 0.09,
  C1: 0.1,
  C2: 0.1,
};

export const INDICATOR_LABELS: Record<IndicatorKey, string> = {
  T1: "Разгрузка дорог",
  T2: "Доступность общественного транспорта",
  E1: "Озеленение",
  E2: "Качество воздуха",
  S1: "Школы и детсады",
  S2: "Поликлиники и первичная медпомощь",
  B1: "Безопасность улиц",
  B2: "Безопасность дорожного движения",
  C1: "Надёжность ЖКХ",
  C2: "Скорость решения обращений",
};

export const INDICATOR_SHORT_LABELS: Record<IndicatorKey, string> = {
  T1: "Дороги",
  T2: "OT",
  E1: "Озеленение",
  E2: "Воздух",
  S1: "Школы",
  S2: "Медицина",
  B1: "Улицы",
  B2: "ДД",
  C1: "ЖКХ",
  C2: "Обращения",
};

export const INDICATOR_GROUPS: Record<
  string,
  { label: string; keys: IndicatorKey[] }
> = {
  transport: { label: "Транспорт", keys: ["T1", "T2"] },
  ecology: { label: "Экология", keys: ["E1", "E2"] },
  social: { label: "Социальная сфера", keys: ["S1", "S2"] },
  safety: { label: "Безопасность", keys: ["B1", "B2"] },
  services: { label: "Сервисы", keys: ["C1", "C2"] },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  transport: "Транспорт",
  ecology: "Экология",
  social: "Социальная сфера",
  safety: "Безопасность",
  services: "Городские сервисы",
};

export const SCORE_CITY_AVERAGE_WEIGHT = 0.7;
export const SCORE_WEAKEST_DISTRICT_WEIGHT = 0.3;

export const EXPECTED_BASELINE_SCORE = 52.56;
export const EXPECTED_CONTROL_SCORE = 56.5;
