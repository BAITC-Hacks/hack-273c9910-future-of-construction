import { BUDGET } from "@/domain/constants";
import type { Decision, DistrictId } from "@/domain/types";

export type CityEvent = {
  id: string;
  title: string;
  description: string;
  districtId: DistrictId;
  reserve: number;
};

export const EVENT_TRIGGER_DECISION = 3;

export const CITY_EVENTS: CityEvent[] = [
  {
    id: "heating_main",
    title: "Авария на теплотрассе",
    description:
      "В морозную ночь прорвало магистраль в районе Алматы. Средства изымаются на аварийный ремонт — план нужно пересобрать.",
    districtId: "almaty",
    reserve: 8,
  },
  {
    id: "spring_flood",
    title: "Весенний паводок",
    description:
      "Талые воды подтопили частный сектор Сарыарки. Часть бюджета уходит на откачку воды и помощь жителям.",
    districtId: "saryarka",
    reserve: 10,
  },
  {
    id: "storm",
    title: "Ураганный ветер",
    description:
      "Шквал сорвал кровли и повалил деревья в Есиле. Город выделяет резерв на восстановление.",
    districtId: "esil",
    reserve: 6,
  },
];

export const CITY_EVENT_IDS = CITY_EVENTS.map((event) => event.id) as [
  string,
  ...string[],
];

export function getScenarioBudget(eventId?: string | null): number {
  if (eventId === undefined || eventId === null) return BUDGET;

  const event = CITY_EVENTS.find((candidate) => candidate.id === eventId);
  if (!event) throw new Error(`Неизвестное городское событие: ${eventId}.`);

  return BUDGET - event.reserve;
}

export function pickCityEvent(decisions: Decision[]): CityEvent {
  const key = decisions
    .map((decision) =>
      decision.scope === "district" ? `${decision.measureId}@${decision.districtId}` : decision.measureId,
    )
    .sort()
    .join("|");
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return CITY_EVENTS[hash % CITY_EVENTS.length];
}
