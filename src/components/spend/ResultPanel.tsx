import { Sparkles } from "lucide-react";
import { INDICATOR_SHORT_LABELS } from "@/domain/constants";
import type { SimulationResult } from "@/domain/types";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { cn, formatDelta, formatScore } from "@/lib/utils";

export function ResultPanel({
  result,
  onReset,
}: {
  result: SimulationResult;
  onReset: () => void;
}) {
  const criticalBefore = result.scoreBefore.criticalIndicators;

  return (
    <section id="result" className="mx-auto w-full max-w-4xl animate-pop">
      <div className="rounded-3xl bg-green px-6 py-10 text-center text-white md:px-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
          Итог вашего мандата
        </p>
        <h2 className="mt-2 text-2xl font-bold md:text-3xl">Индекс качества жизни Астаны</h2>
        <div className="mt-8 grid grid-cols-3 gap-4">
          <Stat label="Было" value={formatScore(result.scoreBefore.finalScore)} />
          <Stat label="Стало" value={formatScore(result.finalScore)} big />
          <Stat label="Изменение" value={formatDelta(result.scoreDelta)} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Info label="Потрачено" value={`${result.totalCost} из 100`} />
        <Info label="Самый слабый район" value={`${result.weakestDistrict.name} · ${formatScore(result.weakestDistrict.score)}`} />
        <Info
          label="Критичные провалы"
          value={`${criticalBefore.length} → ${result.criticalIndicators.length}`}
        />
      </div>

      <div className="panel mt-4 rounded-2xl p-6">
        <h3 className="font-semibold text-ink">Районы до и после</h3>
        <div className="mt-4 space-y-3">
          {result.comparisons.map((district) => {
            const width = Math.max(0, Math.min(100, district.scoreAfter));
            return (
              <div key={district.id} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
                <span className="font-medium text-ink">{district.nameRu}</span>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-green-soft" style={{ width: `${district.scoreBefore}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-green" style={{ width: `${width}%`, opacity: 0.85 }} />
                </div>
                <span className="tabular-nums text-muted">
                  {formatScore(district.scoreBefore)} →{" "}
                  <span className="font-semibold text-ink">{formatScore(district.scoreAfter)}</span>{" "}
                  <span className={cn(district.scoreDelta > 0.0001 ? "text-green" : "text-muted")}>
                    {formatDelta(district.scoreDelta)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {result.activatedSynergies.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-green/30 bg-green-soft/60 p-6">
          <p className="flex items-center gap-2 font-semibold text-green-dark">
            <Sparkles className="h-4 w-4" /> Сработала синергия
          </p>
          {result.activatedSynergies.map((item) => (
            <p key={item.id} className="mt-2 text-sm leading-6 text-ink">
              <span className="font-medium">{item.title}</span> — {INDICATOR_SHORT_LABELS[item.indicator]}{" "}
              {formatDelta(item.bonus, 0)} в районе {DISTRICTS_BY_ID[item.districtId].nameRu}.
            </p>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-center text-xs leading-5 text-muted">
        Предварительный расчёт в браузере. Официальный расчёт и AI-аналитик подключим через backend.
      </p>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onReset}
          className="h-11 rounded-xl border border-line bg-surface px-6 text-sm font-semibold text-ink transition hover:border-green"
        >
          Сыграть ещё раз
        </button>
      </div>
    </section>
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
