"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AccountLink } from "@/components/auth/AccountLink";
import { Bot, CloudLightning, Landmark, Scale, Wallet } from "lucide-react";
import { BUDGET, CATEGORY_LABELS, REQUIRED_DECISIONS } from "@/domain/constants";
import { CATEGORIES } from "@/domain/types";
import type { AlternativeScenario, Category, Decision, SimulationResult } from "@/domain/types";
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

  const budget = budgetLimit - (event?.reserve ?? 0);

  useEffect(() => {
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
    <div className="min-h-screen pb-20">
      <header className="mx-auto flex max-w-3xl flex-col items-center px-5 pb-10 pt-14 text-center">
        <div className="mb-6 flex w-full justify-end"><AccountLink /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green">
          HackAlem AI · AI-симулятор управления городом
        </p>
        <div className="mt-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-green to-green-dark text-white shadow-[0_12px_40px_rgba(22,163,74,0.35)]">
          <Landmark className="h-12 w-12" strokeWidth={1.6} />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink md:text-6xl">Аким на 5 часов</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted md:text-lg">
          У вас <span className="font-semibold text-ink">{budgetLimit} млрд ₸</span> городского бюджета и ровно{" "}
          {REQUIRED_DECISIONS} решений. Распределите их между транспортом, экологией, социальной сферой,
          безопасностью и сервисами так, чтобы Astana Quality of Life Score вырос для всех районов.
        </p>

        <div className="mt-8 grid w-full gap-3 text-left sm:grid-cols-3">
          <Feature icon={<Wallet className="h-4 w-4" />} title="Единый бюджет" text="Одинаковые деньги и данные у всех команд" />
          <Feature icon={<Scale className="h-4 w-4" />} title="Честная модель" text="Задержка эффекта, синергии и конфликты мер" />
          <Feature icon={<Bot className="h-4 w-4" />} title="AI-аналитик" text="Сильные стороны, риски и план улучшения" />
        </div>

        <button
          type="button"
          onClick={toggleEventMode}
          className={cn(
            "mt-6 flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-medium transition",
            eventMode ? "border-rose/40 bg-rose/5 text-rose" : "border-line bg-surface text-ink hover:border-green/60",
          )}
        >
          <CloudLightning className="h-4 w-4" />
          Режим городских событий
          <span className={cn("relative h-5 w-9 rounded-full transition", eventMode ? "bg-rose" : "bg-line-strong")}>
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                eventMode ? "left-[18px]" : "left-0.5",
              )}
            />
          </span>
        </button>
        {eventMode && !event ? (
          <p className="mt-2 text-xs text-muted">
            После {EVENT_TRIGGER_DECISION}-го решения случится непредвиденное событие, и часть бюджета придётся
            перераспределить.
          </p>
        ) : null}
        <label className="mt-5 flex w-full max-w-sm items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-sm">
          <span><span className="block text-sm font-semibold text-ink">Желаемый бюджет</span><span className="text-xs text-muted">Можно изменить под задачу</span></span>
          <span className="flex items-center gap-2"><input type="number" min="20" max="500" value={budgetLimit} onChange={(change) => setBudgetLimit(Math.max(20, Math.min(500, Number(change.target.value) || 20)))} className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-right text-sm font-semibold text-ink outline-none focus:border-green" /><span className="text-xs text-muted">млрд ₸</span></span>
        </label>
      </header>

      <BudgetBar
        spent={spent}
        budget={budget}
        decisions={decisions.length}
        baseScore={BASELINE}
        previewScore={preview ? preview.finalScore : null}
      />

      <main className="mx-auto max-w-6xl space-y-12 px-5 pt-10">
        {event ? <EventBanner event={event} budget={budget} overBudget={spent > budget} /> : null}

        <section>
          <SectionTitle
            title="Город сейчас"
            hint="5 районов Астаны, 10 показателей качества жизни. Оценка района 0–100 обновляется после каждого решения."
          />
          <DistrictStrip before={BASE_DISTRICTS} after={preview?.districtsAfter ?? BASE_DISTRICTS} />
        </section>

        <section>
          <SectionTitle
            title="Что финансируем?"
            hint="Не больше двух мер одного направления. Эффект долгих строек за 8 кварталов проявится не полностью."
          />
          <div className="mb-5 flex flex-wrap gap-2">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>
              Все меры
            </Chip>
            {CATEGORIES.map((item) => (
              <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
                {CATEGORY_LABELS[item]}
              </Chip>
            ))}
          </div>
          <div key={resetKey} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((measure) => (
              <MeasureTile
                key={measure.id}
                measure={measure}
                decisions={decisions}
                budget={budget}
                selected={decisions.find((item) => item.measureId === measure.id)}
                onSelect={select}
                onRemove={() => remove(measure.id)}
              />
            ))}
          </div>
        </section>

        <div id="receipt" className="scroll-mt-28">
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

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="panel rounded-2xl px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-green">{icon}</span>
        {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>
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
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        active ? "border-green bg-green text-white" : "border-line bg-surface text-ink hover:border-green/60",
      )}
    >
      {children}
    </button>
  );
}
