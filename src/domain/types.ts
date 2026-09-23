export const INDICATOR_KEYS = [
  "T1",
  "T2",
  "E1",
  "E2",
  "S1",
  "S2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

export type IndicatorKey = (typeof INDICATOR_KEYS)[number];

export const DISTRICT_IDS = [
  "esil",
  "almaty",
  "saryarka",
  "baikonyr",
  "nura",
] as const;

export type DistrictId = (typeof DISTRICT_IDS)[number];

export const MEASURE_IDS = [
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M7",
  "M8",
  "M9",
  "M10",
  "M11",
  "M12",
  "M13",
  "M14",
] as const;

export type MeasureId = (typeof MEASURE_IDS)[number];

export const CATEGORIES = [
  "transport",
  "ecology",
  "social",
  "safety",
  "services",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Indicators = Record<IndicatorKey, number>;

export type District = {
  id: DistrictId;
  name: string;
  nameRu: string;
  populationShare: number;
  profile: string;
  indicators: Indicators;
};

export type MeasureEffects = Partial<Record<IndicatorKey, number>>;

export type Measure = {
  id: MeasureId;
  name: string;
  category: Category;
  cost: number;
  lag: number;
  effects: MeasureEffects;
} & (
  | { scope: "city" }
  | { scope: "district" }
);

export type CityDecision = {
  measureId: MeasureId;
  scope: "city";
};

export type DistrictDecision = {
  measureId: MeasureId;
  scope: "district";
  districtId: DistrictId;
};

export type Decision = CityDecision | DistrictDecision;

export type ValidationError = {
  code: string;
  message: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

export type AppliedEffect = {
  source: "measure" | "synergy";
  measureId?: MeasureId;
  synergyId?: string;
  districtId: DistrictId;
  indicator: IndicatorKey;
  fullEffect: number;
  realizedEffect: number;
};

export type MeasureContribution = {
  measureId: MeasureId;
  scope: "city" | "district";
  districtId?: DistrictId;
  cost: number;
  lag: number;
  realizedFactor: number;
  effects: Array<{
    districtId: DistrictId;
    indicator: IndicatorKey;
    realizedEffect: number;
  }>;
};

export type ActivatedSynergy = {
  id: string;
  measureIds: [MeasureId, MeasureId];
  title: string;
  description: string;
  districtId: DistrictId;
  indicator: IndicatorKey;
  bonus: number;
};

export type DistrictSnapshot = {
  id: DistrictId;
  name: string;
  nameRu: string;
  populationShare: number;
  profile: string;
  indicators: Indicators;
  score: number;
  criticalIndicators: IndicatorKey[];
  strongestIndicators: IndicatorKey[];
  weakestIndicators: IndicatorKey[];
};

export type IndicatorDelta = Record<IndicatorKey, number>;

export type DistrictComparison = {
  id: DistrictId;
  name: string;
  nameRu: string;
  before: Indicators;
  after: Indicators;
  delta: IndicatorDelta;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  criticalBefore: IndicatorKey[];
  criticalAfter: IndicatorKey[];
};

export type CriticalIndicator = {
  districtId: DistrictId;
  districtName: string;
  indicator: IndicatorKey;
  value: number;
};

export type ScoreBreakdown = {
  districtScores: Record<DistrictId, number>;
  cityAverage: number;
  weakestDistrictId: DistrictId;
  weakestDistrictScore: number;
  criticalCount: number;
  criticalIndicators: CriticalIndicator[];
  finalScore: number;
};

export type SimulationResult = {
  decisions: Decision[];
  districtsBefore: DistrictSnapshot[];
  districtsAfter: DistrictSnapshot[];
  comparisons: DistrictComparison[];
  appliedEffects: AppliedEffect[];
  measureContributions: MeasureContribution[];
  activatedSynergies: ActivatedSynergy[];
  totalCost: number;
  remainingBudget: number;
  scoreBefore: ScoreBreakdown;
  scoreAfter: ScoreBreakdown;
  finalScore: number;
  scoreDelta: number;
  cityAverage: number;
  weakestDistrict: {
    id: DistrictId;
    name: string;
    score: number;
  };
  criticalIndicators: CriticalIndicator[];
};

export type AlternativeScenario = {
  decisions: Decision[];
  totalCost: number;
  remainingBudget: number;
  finalScore: number;
  scoreDelta: number;
  cityAverage: number;
  weakestDistrictId: DistrictId;
  criticalCount: number;
  activatedSynergies: string[];
};

export type OptimizeResult = {
  bestScenario: AlternativeScenario;
  score: number;
  delta: number;
  alternatives: AlternativeScenario[];
  searchedCombinations: number;
  evaluatedScenarios: number;
};

export type DistrictInsight = {
  districtId: DistrictId;
  text: string;
};

export type AiAnalysis = {
  summary: string;
  strengths: string[];
  risks: string[];
  tradeoffs: string[];
  recommendations: string[];
  districtInsights: DistrictInsight[];
  synergyExplanation: string[];
};
