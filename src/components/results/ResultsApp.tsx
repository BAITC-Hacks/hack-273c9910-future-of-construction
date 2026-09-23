"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AiAnalysis, AlternativeScenario, SimulationResult } from "@/domain/types";
import { INDICATOR_LABELS } from "@/domain/constants";
import { MEASURES_BY_ID } from "@/data/measures";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadResult, saveDecisions, toAnalyzeDto } from "@/lib/session";
import { formatDelta, formatIndicator, formatScore } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ResultsApp() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [openDistrict, setOpenDistrict] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeScenario[]>([]);

  useEffect(() => {
    setResult(loadResult());
  }, []);

  const chartData = useMemo(
    () =>
      result?.comparisons.map((item) => ({
        name: item.nameRu,
        before: Number(item.scoreBefore.toFixed(2)),
        after: Number(item.scoreAfter.toFixed(2)),
      })) ?? [],
    [result],
  );

  if (!result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <h1 className="font-serif text-4xl text-gold-bright">Результатов пока нет</h1>
        <p className="mt-3 text-muted">Сначала завершите управление пятью решениями.</p>
        <Link href="/simulator" className="mt-6 text-gold">
          Перейти к симулятору
        </Link>
      </main>
    );
  }

  async function runAnalysis() {
    if (!result) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toAnalyzeDto(result)),
      });
      const payload = await response.json();
      if (!payload.ok) {
        setAnalysis(null);
        setAiMessage(payload.message);
        return;
      }
      setAnalysis(payload.analysis);
    } catch {
      setAiMessage("AI-анализ временно недоступен. Расчёт симуляции выполнен успешно.");
    } finally {
      setAiLoading(false);
    }
  }

  async function runOptimize() {
    setOptimizeLoading(true);
    setOptimizeError(null);
    try {
      const response = await fetch("/api/optimize", { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) {
        setOptimizeError(payload.message ?? "Оптимизатор недоступен.");
        return;
      }
      setAlternatives([payload.result.bestScenario, ...payload.result.alternatives]);
    } catch {
      setOptimizeError("Не удалось найти альтернативный сценарий.");
    } finally {
      setOptimizeLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-10">
      <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Итог мандата</p>
      <h1 className="mt-2 font-serif text-5xl text-gold-bright">Astana Quality of Life Score</h1>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <ScoreCard label="Before" value={formatScore(result.scoreBefore.finalScore)} />
        <ScoreCard label="After" value={formatScore(result.finalScore)} emphasize />
        <ScoreCard label="Delta" value={formatDelta(result.scoreDelta)} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <Meta label="Потрачено" value={`${result.totalCost}`} />
        <Meta label="Остаток" value={`${result.remainingBudget}`} />
        <Meta
          label="Weakest district"
          value={`${result.weakestDistrict.name} · ${formatScore(result.weakestDistrict.score)}`}
        />
        <Meta
          label="Critical after"
          value={
            result.criticalIndicators.length === 0
              ? "нет"
              : result.criticalIndicators
                  .map((item) => `${item.districtName} ${item.indicator}`)
                  .join(", ")
          }
        />
      </section>

      <section className="panel mt-8 rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-3xl">Before / After по районам</h2>
          <Badge>только числа engine</Badge>
        </div>
        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="rgba(212,184,122,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="#8ea0b0" />
              <YAxis stroke="#8ea0b0" domain={[40, 70]} />
              <Tooltip
                contentStyle={{
                  background: "#11202c",
                  border: "1px solid rgba(212,184,122,0.2)",
                  borderRadius: 16,
                }}
              />
              <Legend />
              <Bar dataKey="before" name="До" fill="#8ea0b0" radius={[6, 6, 0, 0]} />
              <Bar dataKey="after" name="После" fill="#d4b87a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        {result.comparisons.map((district) => {
          const open = openDistrict === district.id;
          return (
            <article key={district.id} className="panel rounded-[24px] p-5">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 text-left"
                onClick={() => setOpenDistrict(open ? null : district.id)}
              >
                <div>
                  <h3 className="font-serif text-2xl">{district.nameRu}</h3>
                  <p className="text-sm text-muted">
                    {formatScore(district.scoreBefore)} → {formatScore(district.scoreAfter)}{" "}
                    <span className="text-teal">{formatDelta(district.scoreDelta)}</span>
                  </p>
                </div>
                <span className="text-sm text-gold">{open ? "Скрыть" : "10 показателей"}</span>
              </button>
              {open ? (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {Object.entries(district.after).map(([key, value]) => (
                    <div key={key} className="flex justify-between rounded-xl bg-bg/30 px-3 py-2 text-sm">
                      <span>
                        {key} {INDICATOR_LABELS[key as keyof typeof INDICATOR_LABELS]}
                      </span>
                      <span>
                        {formatIndicator(district.before[key as keyof typeof district.before])} →{" "}
                        {formatIndicator(value)}{" "}
                        <span className="text-teal">
                          {formatDelta(district.delta[key as keyof typeof district.delta])}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="panel mt-8 rounded-[28px] p-6">
        <h2 className="font-serif text-3xl">Что изменили ваши решения</h2>
        <div className="mt-5 space-y-3">
          {result.measureContributions.map((item) => {
            const measure = MEASURES_BY_ID[item.measureId];
            const location =
              item.scope === "city"
                ? "весь город"
                : DISTRICTS_BY_ID[item.districtId!].nameRu;
            return (
              <div key={item.measureId} className="rounded-2xl border border-line px-4 py-3">
                <p className="font-medium">
                  {item.measureId}. {measure.name}
                </p>
                <p className="text-sm text-muted">
                  {location} · стоимость {item.cost} · лаг {item.lag} · realized {(item.realizedFactor * 100).toFixed(0)}%
                </p>
                <p className="mt-2 text-sm">
                  {summarizeEffects(item.effects)}
                </p>
              </div>
            );
          })}
        </div>
        {result.activatedSynergies.length > 0 ? (
          <div className="mt-5 rounded-2xl bg-teal/8 px-4 py-3">
            <p className="text-sm text-teal">Activated synergies</p>
            {result.activatedSynergies.map((item) => (
              <p key={item.id} className="mt-2 text-sm">
                {item.title}: {item.indicator} {formatDelta(item.bonus, 0)} в районе{" "}
                {DISTRICTS_BY_ID[item.districtId].nameRu}. {item.description}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">Синергии не активировались.</p>
        )}
        <div className="mt-4 text-sm text-muted">
          Critical before:{" "}
          {result.scoreBefore.criticalIndicators.length === 0
            ? "нет"
            : result.scoreBefore.criticalIndicators
                .map((item) => `${item.districtName} ${item.indicator}=${formatIndicator(item.value)}`)
                .join(", ")}
        </div>
      </section>

      <section className="panel mt-8 rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">AI City Analyst</p>
            <h2 className="font-serif text-3xl">Разбор готового результата</h2>
          </div>
          <Button onClick={runAnalysis} disabled={aiLoading}>
            {aiLoading ? "Анализ..." : "Запросить AI-анализ"}
          </Button>
        </div>
        {aiMessage ? <p className="mt-4 text-sm text-amber">{aiMessage}</p> : null}
        {analysis ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Insight title="Итог" items={[analysis.summary]} />
            <Insight title="Сильные стороны" items={analysis.strengths} />
            <Insight title="Риски" items={analysis.risks} />
            <Insight title="Компромиссы" items={analysis.tradeoffs} />
            <Insight title="Что можно улучшить" items={analysis.recommendations} />
            <Insight
              title="Районы"
              items={analysis.districtInsights.map((item) => `${item.districtId}: ${item.text}`)}
            />
            <Insight title="Синергии" items={analysis.synergyExplanation} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            AI вызывается только по кнопке и видит лишь structured result. Он не считает Score заново.
          </p>
        )}
      </section>

      <section className="panel mt-8 rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Deterministic optimizer</p>
            <h2 className="font-serif text-3xl">Альтернативный сценарий</h2>
          </div>
          <Button variant="secondary" onClick={runOptimize} disabled={optimizeLoading}>
            {optimizeLoading ? "Поиск..." : "Найти альтернативный сценарий"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Перебор допустимых комбинаций выполняет engine, не LLM. AI может только объяснить уже найденные варианты.
        </p>
        {optimizeError ? <p className="mt-3 text-sm text-rose">{optimizeError}</p> : null}
        <div className="mt-5 grid gap-3">
          {alternatives.map((scenario, index) => (
            <div key={index} className="rounded-2xl border border-line px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">
                  {index === 0 ? "Лучший найденный" : `Альтернатива ${index}`} · Score{" "}
                  {formatScore(scenario.finalScore)} ({formatDelta(scenario.scoreDelta)})
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    saveDecisions(scenario.decisions);
                    window.location.href = "/simulator";
                  }}
                >
                  Открыть в симуляторе
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted">
                Стоимость {scenario.totalCost}, остаток {scenario.remainingBudget}, weakest{" "}
                {DISTRICTS_BY_ID[scenario.weakestDistrictId].nameRu}, critical {scenario.criticalCount}
              </p>
              <p className="mt-2 text-sm">
                {scenario.decisions
                  .map((decision) => {
                    const measure = MEASURES_BY_ID[decision.measureId];
                    const place =
                      decision.scope === "city"
                        ? "город"
                        : DISTRICTS_BY_ID[decision.districtId].nameRu;
                    return `${decision.measureId} ${measure.name} → ${place}`;
                  })
                  .join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex gap-4">
        <Link href="/simulator" className="text-gold">
          Вернуться к решениям
        </Link>
        <Link href="/" className="text-muted">
          На главную
        </Link>
      </div>
    </main>
  );
}

function ScoreCard({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="panel rounded-[28px] px-5 py-6">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-2 font-serif ${emphasize ? "text-5xl text-gold-bright" : "text-4xl"}`}>
        {value}
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel rounded-2xl px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </div>
  );
}

function Insight({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-line px-4 py-4">
      <h3 className="text-sm uppercase tracking-[0.16em] text-gold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/90">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function summarizeEffects(
  effects: Array<{ districtId: string; indicator: string; realizedEffect: number }>,
) {
  const grouped = new Map<string, number[]>();
  for (const effect of effects) {
    const current = grouped.get(effect.indicator) ?? [];
    current.push(effect.realizedEffect);
    grouped.set(effect.indicator, current);
  }

  return Array.from(grouped.entries())
    .map(([indicator, values]) => {
      const first = values[0] ?? 0;
      const uniform = values.every((value) => value === first);
      if (uniform && values.length > 1) {
        return `${indicator} ${formatDelta(first)} в каждом районе`;
      }
      return `${indicator} ${formatDelta(first)}`;
    })
    .join(" · ");
}
