"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CloudLightning, MapPin, SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BUDGET, CATEGORY_LABELS, REQUIRED_DECISIONS } from "@/domain/constants";
import { CATEGORIES, DISTRICT_IDS } from "@/domain/types";
import type { AlternativeScenario, Category, Decision, DistrictId, SimulationResult } from "@/domain/types";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { CITY_EVENTS, EVENT_TRIGGER_DECISION, getScenarioBudget, type CityEvent } from "@/data/events";
import { MEASURES } from "@/data/measures";
import { CONTROL_SCENARIO } from "@/data/examples";
import { adviseImprovements, type Advice } from "@/engine/advisor";
import { buildLocalAnalysis } from "@/ai/localAnalyst";
import { baselineDistricts, previewDecisions } from "@/engine/simulation";
import { baselineScore } from "@/engine/scoring";
import { totalCostOf, validateDecisions } from "@/engine/validator";
import { runAnalysis, runOptimization, runSimulation, type AnalysisOutcome, type SimulationSource } from "@/lib/analysisClient";
import { decisionSchema } from "@/lib/schemas";
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
  clearSession,
  loadDecisions,
  loadSessionValue,
  saveDecisions,
  saveResult,
  saveSessionValue,
} from "@/lib/session";
import { cn } from "@/lib/utils";
import { BudgetBar } from "./BudgetBar";
import { DistrictStrip } from "./DistrictStrip";
import { MeasureTile } from "./MeasureTile";
import { Receipt } from "./Receipt";
import { ResultPanel } from "./ResultPanel";
import "./simulator.css";
import { Consultant } from "./Consultant";
import type { NavigationTarget } from "@/lib/consultant";

const BASELINE = baselineScore().finalScore;
const BASE_DISTRICTS = baselineDistricts();
const EVENT_CHOICE_KEY = "akim-event-choice";

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
  const [selectedDistrictId, setSelectedDistrictId] = useState<DistrictId>("esil");
  const [eventChoice, setEventChoice] = useState(CITY_EVENTS[0].id);
  const [error, setError] = useState<string | null>(null);
  const currentRun = useRef(0);

  const budget = getScenarioBudget(event?.id);

  useEffect(() => {
    const district = new URLSearchParams(window.location.search).get("district");
    if (district && DISTRICT_IDS.includes(district as DistrictId)) {
      setSelectedDistrictId(district as DistrictId);
    }
    const mode = loadSessionValue<unknown>(EVENT_MODE_KEY, false) === true;
    const savedEvent = loadSessionValue<{ id?: string } | null>(EVENT_KEY, null);
    const restoredEvent = mode ? CITY_EVENTS.find((item) => item.id === savedEvent?.id) ?? null : null;
    const stored = decisionSchema.array().max(REQUIRED_DECISIONS).safeParse(loadDecisions());
    if (stored.success && validateDecisions(stored.data, "partial").ok) setDecisions(stored.data);
    setEventMode(mode);
    setEvent(restoredEvent);
    const choice = loadSessionValue<string>(EVENT_CHOICE_KEY, CITY_EVENTS[0].id);
    setEventChoice(CITY_EVENTS.find((item) => item.id === choice)?.id ?? CITY_EVENTS[0].id);
    setTeam(loadTeamName());
    setLeaderboard(loadLeaderboard());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDecisions(decisions);
    saveSessionValue(EVENT_MODE_KEY, eventMode);
    saveSessionValue(EVENT_KEY, event);
    saveSessionValue(EVENT_CHOICE_KEY, eventChoice);
  }, [decisions, eventMode, event, eventChoice, hydrated]);

  useEffect(() => {
    if (hydrated && eventMode && !event && decisions.length >= EVENT_TRIGGER_DECISION) {
      setEvent(CITY_EVENTS.find((item) => item.id === eventChoice) ?? CITY_EVENTS[0]);
      currentRun.current++;
      setOutcome(null);
    }
  }, [eventMode, event, decisions, eventChoice, hydrated]);

  const preview = useMemo(() => {
    if (decisions.length === 0) return null;
    try {
      return previewDecisions(decisions, budget);
    } catch {
      return null;
    }
  }, [decisions, budget]);

  const spent = totalCostOf(decisions);
  const visible = MEASURES.filter((measure) => category === "all" || measure.category === category);

  function select(decision: Decision) {
    if (busy || !hydrated) return;
    const next = [...decisions, decision];
    if (!validateDecisions(next, "partial", budget).ok) return;
    setError(null);
    setOutcome(null);
    setDecisions(next);
  }

  function remove(measureId: Decision["measureId"]) {
    if (busy) return;
    setError(null);
    setOutcome(null);
    setDecisions((current) => current.filter((item) => item.measureId !== measureId));
  }

  function changeTeam(value: string) {
    setTeam(value);
    saveTeamName(value);
  }

  function toggleEventMode() {
    if (busy) return;
    setError(null);
    setEventMode((value) => !value);
    setEvent(null);
    setOutcome(null);
  }

  async function finish() {
    if (busy || !hydrated || !validateDecisions(decisions, "final", budget).ok) return;
    const run = ++currentRun.current;
    setBusy(true);
    setError(null);
    try {
      const { result, source } = await runSimulation(decisions, event?.id ?? null);
      if (run !== currentRun.current) return;
      const advice = adviseImprovements(decisions, { budget });
      saveResult(result, event?.id ?? null);
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
        analysis: { source: "local", analysis: buildLocalAnalysis({ result, advice, budget, event }) },
        entryId,
        aiScenario: null,
      });
      requestAnimationFrame(() =>
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
      await Promise.all([
        runAnalysis({ result, advice, budget, event }).then((analysis) => {
          if (run === currentRun.current) setOutcome((current) => current && current.result === result ? { ...current, analysis } : current);
        }),
        runOptimization(event?.id ?? null).then((optimized) => {
          if (run === currentRun.current && optimized) setOutcome((current) => current && current.result === result ? { ...current, aiScenario: optimized.bestScenario } : current);
        }),
      ]);
    } catch (error) {
      if (run === currentRun.current) setError(error instanceof Error ? error.message : "Не удалось завершить расчёт. Попробуйте снова.");
    } finally {
      if (run === currentRun.current) setBusy(false);
    }
  }

  function applyAdvice() {
    if (!outcome || busy) return;
    setError(null);
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
    if (busy) return;
    currentRun.current++;
    clearSession();
    setDecisions([]);
    setEvent(null);
    setOutcome(null);
    setError(null);
    setResetKey((key) => key + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateFromConsultant(target: NavigationTarget) {
    const isCategory = CATEGORIES.some((item) => item === target);
    if (isCategory) setCategory(target as Category);
    if (target === "measures") setCategory("all");
    requestAnimationFrame(() => {
      const element = document.getElementById(isCategory ? "measures" : target);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (element) {
        element.setAttribute("tabindex", "-1");
        element.focus({ preventScroll: true });
      }
    });
  }

  return (
    <div className="app-shell simulator-shell">
      <SiteHeader />
      <header className="site-container simulator-intro">
        <div className="simulator-intro-copy">
          <p className="eyebrow"><span className="simulator-status-dot" /> Рабочее пространство · Астана</p>
          <h1>Ваш город.<br /><span>Ваши решения.</span></h1>
          <p className="simulator-description">
            {BUDGET} условных единиц, {REQUIRED_DECISIONS} решений и один город.
            Выберите, что изменить, и узнайте, как это повлияет на жизнь районов.
          </p>
          <Link href={`/map?district=${selectedDistrictId}`} className="simulator-map-link">
            <MapPin size={16} /> Исследовать на карте <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="simulator-settings">
          <p className="simulator-settings-title"><SlidersHorizontal size={15} /> Параметры сценария</p>
          <div className="simulator-budget-setting">
            <span>Бюджет города<span className="simulator-setting-hint">Единые условия для всех команд</span></span>
            <span className="simulator-budget-input">
              <strong className="text-xl">{BUDGET}</strong>
              <span>усл. ед.</span>
            </span>
          </div>
          <button type="button" role="switch" aria-checked={eventMode} disabled={busy || !hydrated} onClick={toggleEventMode} className="simulator-event-toggle disabled:opacity-50">
            <span><CloudLightning size={17} /> Режим городских событий</span>
            <span className={cn("simulator-toggle", eventMode && "is-on")}><span /></span>
          </button>
          <p className="simulator-settings-note">
            {eventMode
              ? `После ${EVENT_TRIGGER_DECISION}-го решения событие изменит ваш бюджет.`
              : "Добавьте неожиданные события для нового вызова."}
          </p>
          {eventMode && <label className="mt-4 block text-xs text-muted">Сценарий события
            <select value={eventChoice} disabled={busy || event !== null} onChange={(change) => setEventChoice(change.target.value)} className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink">
              {CITY_EVENTS.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>}
          <p className="simulator-settings-note">14 мер, не больше двух одного направления. Данные районов синтетические.</p>
          <button type="button" disabled={busy || !hydrated} onClick={() => {
            currentRun.current++;
            setEventMode(false); setEvent(null); setDecisions([...CONTROL_SCENARIO]);
            setOutcome(null); setError(null); setResetKey((key) => key + 1);
          }} className="mt-4 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-medium text-green-dark hover:border-green disabled:opacity-50">Загрузить пример из задания</button>
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

        <section id="districts" className="scroll-mt-36">
          <SectionTitle number="01" title="Город сейчас" hint="Выберите район для будущих проектов. Показатели модели обновляются после каждого решения." />
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

        <section id="measures" className="scroll-mt-36">
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
          <fieldset disabled={busy || !hydrated} key={resetKey} className="simulator-measure-grid">
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
          </fieldset>
        </section>

        <div id="receipt" className="scroll-mt-28">
          <SectionTitle number="03" title="Ваша стратегия готова?" hint="Проверьте выбранные проекты и запустите анализ — посмотрим, каким станет город." />
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose/30 bg-rose/5 px-4 py-3 text-sm text-rose">{error}</p>}
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
              busy={busy}
              result={outcome.result}
              simulationSource={outcome.simulationSource}
              analysis={outcome.analysis}
              advice={outcome.advice}
              budget={budget}
              event={event}
              leaderboard={leaderboard.filter((entry) => entry.budget === budget && entry.eventTitle === (event?.title ?? null))}
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
      {hydrated && <Consultant decisions={decisions} eventId={event?.id ?? null} budget={budget} spent={spent} hasResult={outcome !== null} onNavigate={navigateFromConsultant} />}
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
          {event.title}: −{event.reserve} усл. ед.
        </p>
        <p className="mt-1 text-sm leading-6 text-muted">{event.description}</p>
        <p className={cn("mt-2 text-sm font-medium", overBudget ? "text-rose" : "text-ink")}>
          Новый лимит: {budget} усл. ед.{" "}
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
