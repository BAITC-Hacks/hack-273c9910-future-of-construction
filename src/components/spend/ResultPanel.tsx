import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Download,
  Lightbulb,
  Loader2,
  Scale,
  Sparkles,
  ThumbsUp,
  Trophy,
  Wand2,
} from "lucide-react";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { BUDGET } from "@/domain/constants";
import type { AiAnalysis, AlternativeScenario, SimulationResult } from "@/domain/types";
import type { CityEvent } from "@/data/events";
import type { Advice } from "@/engine/advisor";
import { describeDecision } from "@/ai/localAnalyst";
import type { AnalysisOutcome, SimulationSource } from "@/lib/analysisClient";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { buildAiCouncil } from "@/lib/decisionNarrative";
import { cn, formatDelta, formatScore } from "@/lib/utils";

export function ResultPanel({
  result,
  simulationSource,
  analysis,
  advice,
  budget,
  event,
  leaderboard,
  currentEntryId,
  aiScenario,
  onApplyAdvice,
  onDownload,
  onClearLeaderboard,
  onReset,
}: {
  result: SimulationResult;
  simulationSource: SimulationSource;
  analysis: AnalysisOutcome | null;
  advice: Advice;
  budget: number;
  event: CityEvent | null;
  leaderboard: LeaderboardEntry[];
  currentEntryId: string | null;
  aiScenario: AlternativeScenario | null;
  onApplyAdvice: () => void;
  onDownload: () => void;
  onClearLeaderboard: () => void;
  onReset: () => void;
}) {
  const insights = new Map(analysis?.analysis.districtInsights.map((item) => [item.districtId, item.text]) ?? []);
  const council = buildAiCouncil();

  return (
    <section id="result" className="mx-auto w-full max-w-4xl animate-pop scroll-mt-28 space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-green to-green-dark px-6 py-10 text-center text-white md:px-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">ASTANA 2028</p>
        <h2 className="mt-2 text-2xl font-bold md:text-3xl">Quality of Life</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Было" value={formatScore(result.scoreBefore.finalScore)} />
          <Stat label="Стало" value={formatScore(result.finalScore)} big />
          <Stat label="Δ" value={formatDelta(result.scoreDelta)} />
          <Stat label="Бюджет" value={`${result.remainingBudget} / ${BUDGET}`} />
        </div>
        <p className="mt-6 text-xs text-white/70">
          Критических проблем: {result.scoreBefore.criticalCount} → {result.criticalIndicators.length}. Самый слабый район: {result.weakestDistrict.name}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Info label="Потрачено" value={`${result.totalCost} из ${budget} млрд ₸`} />
        <Info
          label="Самый слабый район"
          value={`${result.weakestDistrict.name} · ${formatScore(result.weakestDistrict.score)}`}
        />
        <Info
          label="Критические провалы"
          value={`${result.scoreBefore.criticalCount} → ${result.criticalIndicators.length}`}
        />
      </div>

      <div className="panel rounded-2xl p-6">
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <Wand2 className="h-4 w-4 text-green" /> Цена решения
        </h3>
        <p className="mt-3 text-sm leading-7 text-ink">
          Вы выбрали набор решений, который поднимает индекс качества жизни, но ограничивает альтернативные крупные
          инвестиции в транспорт и городскую инфраструктуру. Это не просто плюс — это реальная цена выбора.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-ink">
          <li>✓ Стабилизирован weakest district и закрыты критические зоны.</li>
          <li>✓ Эффект возрастает за счёт синергии между социальными и экологическими мерами.</li>
          <li>− По сравнению с максимальным сценариев, часть бюджета не задействована в крупном Транспортном проекте.</li>
        </ul>
      </div>

      {aiScenario ? (
        <div className="panel rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-semibold text-ink">
              <Sparkles className="h-4 w-4 text-green" /> Что сделал бы AI?
            </h3>
            <span className="rounded-full bg-green-soft px-3 py-1 text-[11px] font-semibold text-green-dark">
              AI-сценарий
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ScenarioCard
              title="Ваш город"
              score={formatScore(result.finalScore)}
              district={result.weakestDistrict.name}
              budget={`${result.remainingBudget} / ${BUDGET}`}
              critical={`${result.criticalIndicators.length}`}
              accent="human"
            />
            <ScenarioCard
              title="AI-сценарий"
              score={formatScore(aiScenario.finalScore)}
              district={DISTRICTS_BY_ID[aiScenario.weakestDistrictId]?.nameRu ?? "—"}
              budget={`${aiScenario.remainingBudget} / ${BUDGET}`}
              critical={`${aiScenario.criticalCount}`}
              accent="ai"
            />
          </div>
        </div>
      ) : null}

      <AnalysisCard analysis={analysis} />

      <div className="panel rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-ink">
              <Wand2 className="h-4 w-4 text-green" /> AI-советник: как улучшить план
            </h3>
            <p className="mt-1 text-sm text-muted">
              Пошаговый поиск лучших замен в рамках бюджета и правил. Проверено {advice.evaluatedScenarios}{" "}
              сценариев.
            </p>
          </div>
          {advice.steps.length > 0 ? (
            <div className="rounded-xl bg-green-soft px-3 py-1.5 text-sm font-semibold tabular-nums text-green-dark">
              {formatScore(advice.startScore)} → {formatScore(advice.finalScore)}
            </div>
          ) : null}
        </div>
        {advice.steps.length === 0 ? (
          <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink">
            Ваш план уже локально оптимален: ни одна замена меры или района не повышает Score.
          </p>
        ) : (
          <>
            <ol className="mt-4 space-y-2">
              {advice.steps.map((step, index) => (
                <li
                  key={index}
                  className="grid gap-2 rounded-xl border border-line px-4 py-3 text-sm md:grid-cols-[1fr_auto_1fr_auto] md:items-center"
                >
                  <span className="text-muted line-through decoration-rose/50">{describeDecision(step.remove)}</span>
                  <ArrowRight className="hidden h-4 w-4 text-muted md:block" />
                  <span className="font-medium text-ink">{describeDecision(step.add)}</span>
                  <span className="font-semibold tabular-nums text-green">{formatDelta(step.gain)}</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={onApplyAdvice}
              className="mt-4 h-11 rounded-xl bg-green px-5 text-sm font-semibold text-white transition hover:bg-green-dark"
            >
              Применить улучшенный план
            </button>
          </>
        )}
      </div>

      <div className="panel rounded-2xl p-6">
        <h3 className="font-semibold text-ink">Районы до и после</h3>
        <div className="mt-4 space-y-4">
          {result.comparisons.map((district) => (
            <div key={district.id}>
              <div className="grid grid-cols-[100px_1fr_auto] items-center gap-3 text-sm">
                <span className="font-medium text-ink">{district.nameRu}</span>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-green-soft"
                    style={{ width: `${district.scoreBefore}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-green"
                    style={{ width: `${Math.min(100, district.scoreAfter)}%`, opacity: 0.85 }}
                  />
                </div>
                <span className="tabular-nums text-muted">
                  {formatScore(district.scoreBefore)} →{" "}
                  <span className="font-semibold text-ink">{formatScore(district.scoreAfter)}</span>{" "}
                  <span className={cn(district.scoreDelta > 0.0001 ? "text-green" : "text-muted")}>
                    {formatDelta(district.scoreDelta)}
                  </span>
                </span>
              </div>
              {insights.get(district.id) ? (
                <p className="mt-1 text-xs leading-5 text-muted md:pl-[112px]">{insights.get(district.id)}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {analysis && analysis.analysis.synergyExplanation.length > 0 ? (
        <div className="rounded-2xl border border-green/30 bg-green-soft/60 p-6">
          <p className="flex items-center gap-2 font-semibold text-green-dark">
            <Sparkles className="h-4 w-4" />
            {result.activatedSynergies.length > 0 ? "Сработала синергия" : "Упущенная синергия"}
          </p>
          {analysis.analysis.synergyExplanation.map((text) => (
            <p key={text} className="mt-2 text-sm leading-6 text-ink">
              {text}
            </p>
          ))}
        </div>
      ) : null}

      <div className="panel rounded-2xl p-6">
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <Bot className="h-4 w-4 text-green" /> AI Council — виртуальное совещание акимата
        </h3>
        <div className="mt-4 space-y-3">
          {council.map((item) => (
            <div key={item.title} className="rounded-xl border border-line bg-surface-2 p-4">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-green/30 bg-green-soft/50 px-4 py-3 text-sm leading-6 text-ink">
          <span className="font-semibold text-green-dark">AI Chief Analyst:</span> Компромисс вашего сценария в том,
          что сильный социальный эффект в Нуре заметно усиливает слабый район, но сокращает запас на более крупную
          транспортную перестройку в Есиле.
        </div>
      </div>

      {event ? (
        <div className="rounded-2xl border border-rose/25 bg-rose/5 p-5 text-sm leading-6 text-ink">
          <span className="font-semibold text-rose">Городское событие · {event.title}.</span> Из бюджета изъято{" "}
          {event.reserve} млрд ₸, лимит сократился до {budget} млрд ₸.
        </div>
      ) : null}

      <Leaderboard entries={leaderboard} currentId={currentEntryId} onClear={onClearLeaderboard} />

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={!analysis}
          className="flex h-11 items-center gap-2 rounded-xl bg-green px-6 text-sm font-semibold text-white transition hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Скачать отчёт команды
        </button>
        <button
          type="button"
          onClick={onReset}
          className="h-11 rounded-xl border border-line bg-surface px-6 text-sm font-semibold text-ink transition hover:border-green"
        >
          Сыграть ещё раз
        </button>
      </div>
      <p className="text-center text-xs leading-5 text-muted">
        Расчёт: {simulationSource === "server" ? "сервер /api/simulate" : "браузер (тот же движок, что и на сервере)"}.
        Все числа считает детерминированный движок — AI только объясняет.
      </p>
    </section>
  );
}

function AnalysisCard({ analysis }: { analysis: AnalysisOutcome | null }) {
  return (
    <div className="panel rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <Bot className="h-5 w-5 text-green" /> AI-анализ сценария
        </h3>
        {analysis ? (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold",
              analysis.source === "llm" ? "bg-green text-white" : "bg-surface-2 text-muted",
            )}
          >
            {analysis.source === "llm" ? "LLM-аналитик" : "Встроенный аналитик · без API-ключа"}
          </span>
        ) : null}
      </div>

      {!analysis ? (
        <div className="mt-5 flex items-center gap-3 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-green" /> Анализируем решения, стоимость и влияние на районы…
        </div>
      ) : (
        <AnalysisBody analysis={analysis.analysis} />
      )}
    </div>
  );
}

function AnalysisBody({ analysis }: { analysis: AiAnalysis }) {
  return (
    <>
      <p className="mt-4 text-[15px] leading-7 text-ink">{analysis.summary}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Block icon={<ThumbsUp className="h-4 w-4" />} title="Сильные стороны" tone="green" items={analysis.strengths} />
        <Block icon={<AlertTriangle className="h-4 w-4" />} title="Риски" tone="rose" items={analysis.risks} />
        <Block
          icon={<Scale className="h-4 w-4" />}
          title="Компромиссы и последствия"
          tone="neutral"
          items={analysis.tradeoffs}
        />
        <Block
          icon={<Lightbulb className="h-4 w-4" />}
          title="Рекомендации"
          tone="green"
          items={analysis.recommendations}
        />
      </div>
    </>
  );
}

function ScenarioCard({
  title,
  score,
  district,
  budget,
  critical,
  accent,
}: {
  title: string;
  score: string;
  district: string;
  budget: string;
  critical: string;
  accent: "human" | "ai";
}) {
  return (
    <div className={cn("rounded-2xl border p-4", accent === "human" ? "border-line bg-surface-2" : "border-green/30 bg-green-soft") }>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{title}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{score}</p>
      <div className="mt-4 space-y-2 text-sm text-muted">
        <div className="flex justify-between gap-3"><span>Слабый район</span><span className="font-medium text-ink">{district}</span></div>
        <div className="flex justify-between gap-3"><span>Критических</span><span className="font-medium text-ink">{critical}</span></div>
        <div className="flex justify-between gap-3"><span>Бюджет</span><span className="font-medium text-ink">{budget}</span></div>
      </div>
    </div>
  );
}

function Block({
  icon,
  title,
  items,
  tone,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  tone: "green" | "rose" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          tone === "green" && "text-green-dark",
          tone === "rose" && "text-rose",
          tone === "neutral" && "text-ink",
        )}
      >
        {icon} {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Нет замечаний.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-ink">
              <span
                className={cn(
                  "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                  tone === "green" && "bg-green",
                  tone === "rose" && "bg-rose",
                  tone === "neutral" && "bg-muted",
                )}
              />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Leaderboard({
  entries,
  currentId,
  onClear,
}: {
  entries: LeaderboardEntry[];
  currentId: string | null;
  onClear: () => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="panel rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <Trophy className="h-4 w-4 text-green" /> Сравнение команд
        </h3>
        <button type="button" onClick={onClear} className="text-xs text-muted transition hover:text-rose">
          Очистить
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">Одинаковый бюджет и исходные данные у всех команд.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted">
              <th className="pb-2 pr-3">#</th>
              <th className="pb-2 pr-3">Команда</th>
              <th className="pb-2 pr-3 text-right">Score</th>
              <th className="pb-2 pr-3 text-right">Δ</th>
              <th className="pb-2 text-right">Потрачено</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 10).map((entry, index) => (
              <tr
                key={entry.id}
                className={cn("border-t border-line", entry.id === currentId && "bg-green-soft/60 font-semibold")}
              >
                <td className="py-2 pr-3 tabular-nums text-muted">{index + 1}</td>
                <td className="py-2 pr-3 text-ink">
                  {entry.team}
                  {entry.eventTitle ? <span className="ml-2 text-xs font-normal text-rose">· {entry.eventTitle}</span> : null}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink">{formatScore(entry.score)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-green">{formatDelta(entry.delta)}</td>
                <td className="py-2 text-right tabular-nums text-muted">
                  {entry.spent}/{entry.budget} млрд ₸
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-white/70">{label}</p>
      <p className={cn("mt-1 font-bold tabular-nums", big ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl")}>
        {value}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel rounded-2xl px-5 py-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
