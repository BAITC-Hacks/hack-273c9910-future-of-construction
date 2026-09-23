"use client";

import { INDICATOR_LABELS } from "@/domain/constants";
import type { DistrictId, DistrictSnapshot } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn, formatIndicator, formatScore, indicatorTone } from "@/lib/utils";

const TONE_CLASS = {
  critical: "text-rose",
  warn: "text-amber",
  ok: "text-ink",
  strong: "text-teal",
};

export function DistrictBoard({
  districts,
  selectedId,
  onSelect,
}: {
  districts: DistrictSnapshot[];
  selectedId: DistrictId | null;
  onSelect: (id: DistrictId) => void;
}) {
  const selected = districts.find((district) => district.id === selectedId) ?? districts[0];

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Районы Астаны</p>
          <h2 className="font-serif text-3xl text-ink">Схема города</h2>
        </div>
        <p className="max-w-md text-sm text-muted">
          Не карта GIS, а рабочая схема районов. Выберите район, чтобы увидеть профиль и 10 показателей.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {districts.map((district) => {
          const active = district.id === selected.id;
          return (
            <button
              key={district.id}
              type="button"
              onClick={() => onSelect(district.id)}
              className={cn(
                "panel rounded-2xl p-4 text-left transition",
                active ? "border-gold/50 ring-1 ring-gold/30" : "hover:border-gold/30",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{district.nameRu}</p>
                <span className="text-[11px] text-muted">
                  {Math.round(district.populationShare * 100)}%
                </span>
              </div>
              <p className="mt-3 font-serif text-3xl text-gold-bright">
                {formatScore(district.score)}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                District score
              </p>
              {district.criticalIndicators.length > 0 ? (
                <p className="mt-3 text-xs text-rose">
                  Критично: {district.criticalIndicators.join(", ")}
                </p>
              ) : (
                <p className="mt-3 text-xs text-teal">Нет критических показателей</p>
              )}
            </button>
          );
        })}
      </div>

      {selected ? <DistrictDetail district={selected} /> : null}
    </section>
  );
}

function DistrictDetail({ district }: { district: DistrictSnapshot }) {
  return (
    <div className="panel rounded-[28px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-serif text-3xl">{district.nameRu}</h3>
            <Badge>District score {formatScore(district.score)}</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{district.profile}</p>
        </div>
        <div className="grid gap-2 text-sm">
          <p>
            <span className="text-muted">Сильные: </span>
            {district.strongestIndicators
              .map((key) => `${key} ${formatIndicator(district.indicators[key])}`)
              .join(" · ")}
          </p>
          <p>
            <span className="text-muted">Слабые: </span>
            {district.weakestIndicators
              .map((key) => `${key} ${formatIndicator(district.indicators[key])}`)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {Object.entries(district.indicators).map(([key, value]) => {
          const tone = indicatorTone(value);
          return (
            <div key={key} className="rounded-2xl border border-line bg-bg/40 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="mr-2 text-gold">{key}</span>
                  {INDICATOR_LABELS[key as keyof typeof INDICATOR_LABELS]}
                </p>
                <p className={cn("font-medium", TONE_CLASS[tone])}>{formatIndicator(value)}</p>
              </div>
              <Progress
                className="mt-2"
                value={value}
                tone={tone === "critical" ? "rose" : tone === "strong" ? "teal" : "gold"}
              />
              {value < 40 ? (
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-rose">
                  Критический показатель
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
