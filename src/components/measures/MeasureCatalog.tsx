"use client";

import { CATEGORY_LABELS, INDICATOR_SHORT_LABELS } from "@/domain/constants";
import type { Decision, DistrictId, Measure } from "@/domain/types";
import { CATEGORIES } from "@/domain/types";
import { DISTRICTS } from "@/data/districts";
import { MEASURES } from "@/data/measures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { districtConflictHint, selectedMeasureIds, whyBlocked } from "@/lib/eligibility";
import { cn, formatDelta } from "@/lib/utils";
import { useMemo, useState, type ReactNode } from "react";

export function MeasureCatalog({
  decisions,
  onAdd,
}: {
  decisions: Decision[];
  onAdd: (decision: Decision) => void;
}) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | "all">("all");
  const selected = selectedMeasureIds(decisions);

  const visible = useMemo(
    () => MEASURES.filter((measure) => category === "all" || measure.category === category),
    [category],
  );

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Каталог мер</p>
        <h2 className="font-serif text-3xl">Выбор мероприятий</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
          Все
        </FilterChip>
        {CATEGORIES.map((item) => (
          <FilterChip key={item} active={category === item} onClick={() => setCategory(item)}>
            {CATEGORY_LABELS[item]}
          </FilterChip>
        ))}
      </div>
      <div className="grid gap-3">
        {visible.map((measure) => (
          <MeasureCard
            key={measure.id}
            measure={measure}
            decisions={decisions}
            selected={selected.has(measure.id)}
            onAdd={onAdd}
          />
        ))}
      </div>
    </section>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.14em]",
        active ? "border-gold/50 bg-gold/10 text-gold-bright" : "border-line text-muted",
      )}
    >
      {children}
    </button>
  );
}

function MeasureCard({
  measure,
  decisions,
  selected,
  onAdd,
}: {
  measure: Measure;
  decisions: Decision[];
  selected: boolean;
  onAdd: (decision: Decision) => void;
}) {
  const [districtId, setDistrictId] = useState<DistrictId | undefined>(undefined);
  const blocked = whyBlocked(
    decisions,
    measure,
    measure.scope === "district" ? districtId : undefined,
  );

  return (
    <article className={cn("panel rounded-2xl p-4", selected && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-gold">{measure.id}</p>
            <Badge>{CATEGORY_LABELS[measure.category]}</Badge>
            <Badge>{measure.scope === "city" ? "Город" : "Район"}</Badge>
          </div>
          <h3 className="mt-2 text-lg leading-snug">{measure.name}</h3>
        </div>
        <div className="text-right">
          <p className="font-serif text-2xl text-gold-bright">{measure.cost}</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">стоимость</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">Лаг: {measure.lag} кв. из горизонта 8</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(measure.effects).map(([key, value]) => (
          <span
            key={key}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              (value ?? 0) < 0 ? "bg-rose/10 text-rose" : "bg-teal/10 text-teal",
            )}
          >
            {formatDelta(value ?? 0, 0)} {key} {INDICATOR_SHORT_LABELS[key as keyof typeof INDICATOR_SHORT_LABELS]}
          </span>
        ))}
      </div>

      {measure.scope === "district" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {DISTRICTS.map((district) => {
            const conflict = districtConflictHint(decisions, measure, district.id);
            return (
              <button
                key={district.id}
                type="button"
                disabled={Boolean(conflict) || selected}
                onClick={() => setDistrictId(district.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  districtId === district.id
                    ? "border-gold/60 bg-gold/10 text-gold-bright"
                    : "border-line text-muted",
                  conflict && "opacity-35",
                )}
                title={conflict ?? undefined}
              >
                {district.nameRu}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{blocked && !selected ? blocked : " "}</p>
        <Button
          size="sm"
          disabled={selected || Boolean(blocked)}
          onClick={() => {
            if (measure.scope === "city") {
              onAdd({ measureId: measure.id, scope: "city" });
            } else if (districtId) {
              onAdd({ measureId: measure.id, scope: "district", districtId });
            }
          }}
        >
          {selected ? "Выбрано" : "Добавить"}
        </Button>
      </div>
    </article>
  );
}
