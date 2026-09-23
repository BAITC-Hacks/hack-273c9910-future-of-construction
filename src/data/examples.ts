import type { Decision } from "@/domain/types";

/** Reference scenario supplied with the task: cost 95, Score 56.54307. */
export const CONTROL_SCENARIO: Decision[] = [
  { measureId: "M7", scope: "district", districtId: "nura" },
  { measureId: "M8", scope: "district", districtId: "nura" },
  { measureId: "M10", scope: "district", districtId: "nura" },
  { measureId: "M12", scope: "city" },
  { measureId: "M5", scope: "district", districtId: "saryarka" },
];
