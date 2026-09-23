"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CloudLightning, MapPin, SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BUDGET, CATEGORY_LABELS, REQUIRED_DECISIONS } from "@/domain/constants";
import { CATEGORIES, DISTRICT_IDS } from "@/domain/types";
import type { AlternativeScenario, Category, Decision, DistrictId, SimulationResult } from "@/domain/types";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { EVENT_TRIGGER_DECISION, pickCityEvent, type CityEvent } from "@/data/events";
import { MEASURES } from "@/data/measures";
import { adviseImprovements, type Advice } from "@/engine/advisor";
import { optimizeScenarios } from "@/engine/optimizer";
import { baselineDistricts, previewDecisions } from "@/engine/simulation";
import { baselineScore } from "@/engine/scoring";
import { totalCostOf, validateDecisions } from "@/engine/validator";
import { runAnalysis, runSimulation, type AnalysisOutcome, type SimulationSource } from "@/lib/analysisClient";
import {
  addLeaderboardEntry,
  clearLeaderboard,
  loadLeaderboard,
  loadTeamName,
  saveTeamName,
  type LeaderboardEntry,
} from "@/lib/leaderboard";
import { buildReportMarkdown, downloadText } from "@/lib/report";
import {
  EVENT_KEY,
  EVENT_MODE_KEY,
  BUDGET_KEY,
  clearSession,
  loadDecisions,
  loadSessionValue,
  saveDecisions,
  saveSessionValue,
} from "@/lib/session";
import { cn } from "@/lib/utils";
import { BudgetBar } from "./BudgetBar";
import { DistrictStrip } from "./DistrictStrip";
import { MeasureTile } from "./MeasureTile";
import { Receipt } from "./Receipt";
import { ResultPanel } from "./ResultPanel";
import "./simulator.css";

const BASELINE = baselineScore().finalScore;
const BASE_DISTRICTS = baselineDistricts();

type Outcome = {
  result: SimulationResult;
  simulationSource: SimulationSource;
  advice: Advice;
  analysis: AnalysisOutcome | null;
  entryId: string | null;
  aiScenario: AlternativeScenario | null;
};

export function SpendGame() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [category, setCategory] = useState<Category | "all">("all");
  const [eventMode, setEventMode] = useState(false);
  const [event, setEvent] = useState<CityEvent | null>(null);
  const [team, setTeam] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [budgetLimit, setBudgetLimit] = useState(BUDGET);
  const [selectedDistrictId, setSelectedDistrictId] = useState<DistrictId>("esil");

  const budget = budgetLimit - (event?.reserve ?? 0);

  useEffect(() => {
    const district = new URLSearchParams(window.location.search).get("district");
    if (district && DISTRICT_IDS.includes(district as DistrictId)) {
      setSelectedDistrictId(district as DistrictId);
    }
    const stored = loadDecisions();
    if (validateDecisions(stored, "partial").ok) setDecisions(stored);
    setEventMode(loadSessionValue(EVENT_MODE_KEY, false));
    setEvent(loadSessionValue<CityEvent | null>(EVENT_KEY, null));
    setBudgetLimit(loadSessionValue(BUDGET_KEY, BUDGET));
    setTeam(loadTeamName());
    setLeaderboard(loadLeaderboard());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDecisions(decisions);
    saveSessionValue(EVENT_MODE_KEY, eventMode);
    saveSessionValue(EVENT_KEY, event);
    saveSessionValue(BUDGET_KEY, budgetLimit);
  }, [decisions, eventMode, event, budgetLimit, hydrated]);

  useEffect(() => {
    if (eventMode && !event && decisions.length >= EVENT_TRIGGER_DECISION) {
      setEvent(pickCityEvent(decisions));
    }
  }, [eventMode, event, decisions]);

  const preview = useMemo(() => {
    if (decisions.length === 0) return null;
    try {
      return previewDecisions(decisions);
    } catch {
      return null;
    }
  }, [decisions]);

  const spent = totalCostOf(decisions);
  const visible = MEASURES.filter((measure) => category === "all" || measure.category === category);

  function select(decision: Decision) {
    const next = [...decisions, decision];
    if (!validateDecisions(next, "partial", budget).ok) return;
    setOutcome(null);
    setDecisions(next);
  }

  function remove(measureId: Decision["measureId"]) {
    setOutcome(null);
    setDecisions((current) => current.filter((item) => item.measureId !== measureId));
  }

  function changeTeam(value: string) {
    setTeam(value);
    saveTeamName(value);
  }

  function toggleEventMode() {
    setEventMode((value) => !value);
    setEvent(null);
    setOutcome(null);
  }

  async function finish() {
    if (!validateDecisions(decisions, "final", budget).ok) return;
    setBusy(true);
    try {
      const { result, source } = await runSimulation(decisions);
      const advice = adviseImprovements(decisions, { budget });
      const optimized = optimizeScenarios();
      const { entries, id: entryId } = addLeaderboardEntry({
        team: team.trim() || "Без названия",
        score: result.finalScore,
        delta: result.scoreDelta,
        spent: result.totalCost,
        budget,
        eventTitle: event?.title ?? null,
        decisions,
      });
      setLeaderboard(entries);
      setOutcome({
        result,
        simulationSource: source,
        advice,
        analysis: null,
        entryId,
        aiScenario: {
          decisions: optimized.bestScenario.decisions,
          totalCost: optimized.bestScenario.totalCost,
          remainingBudget: optimized.bestScenario.remainingBudget,
          finalScore: optimized.bestScenario.finalScore,
          scoreDelta: optimized.bestScenario.scoreDelta,
          cityAverage: optimized.bestScenario.cityAverage,
          weakestDistrictId: optimized.bestScenario.weakestDistrictId,
          criticalCount: optimized.bestScenario.criticalCount,
          activatedSynergies: optimized.bestScenario.activatedSynergies,
        },
      });
      requestAnimationFrame(() =>
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
      const analysis = await runAnalysis({ result, advice, budget, event });
      setOutcome((current) => (current && current.result === result ? { ...current, analysis } : current));
    } finally {
      setBusy(false);
    }
  }

  function applyAdvice() {
    if (!outcome) return;
    setDecisions(outcome.advice.decisions);
    setOutcome(null);
    setResetKey((key) => key + 1);
    requestAnimationFrame(() =>
      document.getElementById("receipt")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function download() {
    if (!outcome?.analysis) return;
    const markdown = buildReportMarkdown({
      team,
      result: outcome.result,
      analysis: outcome.analysis.analysis,
      analysisSource: outcome.analysis.source,
      advice: outcome.advice,
      budget,
      event,
    });
    const slug = (team.trim() || "team").replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
    downloadText(`akim-5-hours-${slug}.md`, markdown);
  }

  function resetLeaderboard() {
    clearLeaderboard();
    setLeaderboard([]);
  }

  function reset() {
    clearSession();
    setDecisions([]);
    setEvent(null);
    setOutcome(null);
    setResetKey((key) => key + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell simulator-shell">
      <SiteHeader />
      <header className="site-container simulator-intro">
        <div className="simulator-intro-copy">
          <p className="eyebrow"><span className="simulator-status-dot" /> Рабочее пространство · Астана</p>
          <h1>Ваш город.<br /><span>Ваши решения.</span></h1>
          <p className="simulator-description">
            {REQUIRED_DECISIONS} решений, один город и тысячи возможностей.
            Выберите, что изменить, и узнайте, как это повлияет на жизнь районов.
          </p>
          <Link href={`/map?district=${selectedDistrictId}`} className="simulator-map-link">
            <MapPin size={16} /> Исследовать на карте <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="simulator-settings">
          <p className="simulator-settings-title"><SlidersHorizontal size={15} /> Параметры сценария</p>
          <label className="simulator-budget-setting">
            <span>Бюджет города<span className="simulator-setting-hint">От 20 до 500 млрд ₸</span></span>
            <span className="simulator-budget-input">
              <input
                type="number"
                min="20"
                max="500"
                aria-label="Бюджет города в миллиардах тенге"
                value={budgetLimit}
                onChange={(change) => {
                  setBudgetLimit(Math.max(20, Math.min(500, Number(change.target.value) || 20)));
                  setOutcome(null);
                }}
              />
              <span>млрд ₸</span>
            </span>
          </label>
          <button type="button" role="switch" aria-checked={eventMode} onClick={toggleEventMode} className="simulator-event-toggle">
            <span><CloudLightning size={17} /> Городские события</span>
            <span className={cn("simulator-toggle", eventMode && "is-on")}><span /></span>
          </button>
          <p className="simulator-settings-note">
            {eventMode
              ? `После ${EVENT_TRIGGER_DECISION}-го решения событие изменит ваш бюджет.`
              : "Добавьте неожиданные события для нового вызова."}
          </p>
        </div>
      </header>

      <BudgetBar
        spent={spent}
        budget={budget}
        decisions={decisions.length}
        baseScore={BASELINE}
        previewScore={preview ? preview.finalScore : null}
      />

      <main id="main-content" className="site-container simulator-main">
        {event ? <EventBanner event={event} budget={budget} overBudget={spent > budget} /> : null}

        <section>
          <SectionTitle number="01" title="Почувствуйте город" hint="Выберите район для будущих проектов. Показатели модели обновляются после каждого решения." />
          <DistrictStrip
            before={BASE_DISTRICTS}
            after={preview?.districtsAfter ?? BASE_DISTRICTS}
            selectedDistrictId={selectedDistrictId}
            onSelectDistrict={setSelectedDistrictId}
          />
          <div className="simulator-district-context">
            <div className="simulator-district-context-icon"><MapPin size={20} /></div>
            <div>
              <p><strong>{DISTRICTS_BY_ID[selectedDistrictId].nameRu}</strong><span>Выбран для проектов</span></p>
              <p>{DISTRICTS_BY_ID[selectedDistrictId].profile}</p>
            </div>
            <Link href={`/map?district=${selectedDistrictId}`}>На карте <ArrowUpRight size={16} /></Link>
          </div>
        </section>

        <section>
          <SectionTitle
            number="02"
            title="Во что инвестируем?"
            hint="Выберите 5 проектов. Не больше двух в одном направлении — городу нужен баланс."
          />
          <div className="simulator-filter-row" aria-label="Направления проектов">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>
              Все проекты <span className="simulator-filter-count">{MEASURES.length}</span>
            </Chip>
            {CATEGORIES.map((item) => (
              <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
                {CATEGORY_LABELS[item]}
              </Chip>
            ))}
          </div>
          <div key={resetKey} className="simulator-measure-grid">
            {visible.map((measure) => (
              <MeasureTile
                key={measure.id}
                measure={measure}
                decisions={decisions}
                budget={budget}
                defaultDistrictId={selectedDistrictId}
                selected={decisions.find((item) => item.measureId === measure.id)}
                onSelect={select}
                onRemove={() => remove(measure.id)}
              />
            ))}
          </div>
        </section>

        <div id="receipt" className="scroll-mt-28">
          <SectionTitle number="03" title="Ваша стратегия готова?" hint="Проверьте выбранные проекты и запустите анализ — посмотрим, каким станет город." />
          <Receipt
            decisions={decisions}
            spent={spent}
            budget={budget}
            event={event}
            team={team}
            busy={busy}
            onTeamChange={changeTeam}
            onFinish={finish}
            onReset={reset}
          />
        </div>

        {outcome ? (
          <div>
            <ResultPanel
              result={outcome.result}
              simulationSource={outcome.simulationSource}
              analysis={outcome.analysis}
              advice={outcome.advice}
              budget={budget}
              event={event}
              leaderboard={leaderboard}
              currentEntryId={outcome.entryId}
              aiScenario={outcome.aiScenario ?? null}
              onApplyAdvice={applyAdvice}
              onDownload={download}
              onClearLeaderboard={resetLeaderboard}
              onReset={reset}
            />
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function EventBanner({ event, budget, overBudget }: { event: CityEvent; budget: number; overBudget: boolean }) {
  return (
    <div className="animate-pop flex gap-4 rounded-2xl border border-rose/25 bg-surface p-5 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose/10 text-rose">
        <CloudLightning className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose">Городское событие</p>
        <p className="mt-1 text-lg font-semibold text-ink">
          {event.title}: −{event.reserve} млрд ₸
        </p>
        <p className="mt-1 text-sm leading-6 text-muted">{event.description}</p>
        <p className={cn("mt-2 text-sm font-medium", overBudget ? "text-rose" : "text-ink")}>
          Новый лимит: {budget} млрд ₸.{" "}
          {overBudget ? "Текущий план не помещается — отмените одну из мер." : "План нужно уложить в него."}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ number, title, hint }: { number: string; title: string; hint: string }) {
  return (
    <div className="simulator-section-title">
      <span>{number}</span>
      <div><h2>{title}</h2><p>{hint}</p></div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "simulator-filter-chip",
        active ? "border-green bg-green text-white" : "border-line bg-surface text-ink hover:border-green/60",
      )}
    >
      {children}
    </button>
  );
}
