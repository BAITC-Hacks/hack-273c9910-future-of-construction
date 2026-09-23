import type { IndicatorKey, MeasureId } from "@/domain/types";

export type SynergyRule = {
  id: string;
  measureIds: [MeasureId, MeasureId];
  anchorMeasureId: MeasureId;
  indicator: IndicatorKey;
  bonus: number;
  title: string;
  description: string;
};

export const SYNERGIES: SynergyRule[] = [
  {
    id: "M1_M2",
    measureIds: ["M1", "M2"],
    anchorMeasureId: "M1",
    indicator: "T1",
    bonus: 2,
    title: "Выделенные полосы + умные светофоры",
    description:
      "Синхронизация светофорной сети с выделенными полосами усиливает разгрузку дорог в районе M1. Бонус не масштабируется лагом.",
  },
  {
    id: "M10_M12",
    measureIds: ["M10", "M12"],
    anchorMeasureId: "M10",
    indicator: "B1",
    bonus: 2,
    title: "Safe City + цифровая платформа обращений",
    description:
      "Камеры и единая платформа обращений усиливают безопасность улиц в районе M10. Бонус не масштабируется лагом.",
  },
  {
    id: "M5_M6",
    measureIds: ["M5", "M6"],
    anchorMeasureId: "M5",
    indicator: "E2",
    bonus: 2,
    title: "Чистое топливо + городское озеленение",
    description:
      "Снижение выбросов частного сектора и городские ветрозащитные полосы дают дополнительный эффект для качества воздуха в районе M5. Бонус не масштабируется лагом.",
  },
];
