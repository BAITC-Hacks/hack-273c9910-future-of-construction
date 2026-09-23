"use client";

import { useState } from "react";
import { Check, MapPin } from "lucide-react";
import { CATEGORY_LABELS, INDICATOR_SHORT_LABELS } from "@/domain/constants";
import type { Decision, DistrictId, Measure } from "@/domain/types";
import { DISTRICTS, DISTRICTS_BY_ID } from "@/data/districts";
import { districtConflictHint, NEEDS_DISTRICT, whyBlocked } from "@/lib/eligibility";
import { buildImpactPreview } from "@/lib/decisionNarrative";
import { cn, formatDelta } from "@/lib/utils";
import { MEASURE_VISUALS } from "./measureVisuals";

export function MeasureTile({
  measure,
  decisions,
  selected,
  budget,
  onSelect,
  onRemove,
}: {
  measure: Measure;
  decisions: Decision[];
  budget: number;
  selected: Decision | undefined;
  onSelect: (decision: Decision) => void;
  onRemove: () => void;
}) {
  const [districtId, setDistrictId] = useState<DistrictId | undefined>(undefined);
  const { icon: Icon, blurb } = MEASURE_VISUALS[measure.id];
  const selectedDistrictId = selected && selected.scope === "district" ? selected.districtId : undefined;
  const preview = buildImpactPreview(measure, districtId ?? selectedDistrictId);
  const isDistrict = measure.scope === "district";
  const blocked = selected
    ? null
    : whyBlocked(decisions, measure, isDistrict ? districtId : undefined, budget);
  const needsDistrict = blocked === NEEDS_DISTRICT;
  const hardBlocked = Boolean(blocked) && !needsDistrict;
  const unavailableAnywhere =
    isDistrict && !selected && whyBlocked(decisions, measure, undefined, budget) !== NEEDS_DISTRICT;

  function choose() {
    if (measure.scope === "city") {
      onSelect({ measureId: measure.id, scope: "city" });
    } else if (districtId) {
      onSelect({ measureId: measure.id, scope: "district", districtId });
    }
  }

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-surface p-5 transition",
        selected
          ? "border-green shadow-[0_0_0_3px_var(--green-soft)]"
          : "border-line hover:border-line-strong hover:shadow-sm",
        hardBlocked && "opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            selected ? "bg-green text-white" : "bg-green-soft text-green-dark",
          )}
        >
          <Icon className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-ink">{measure.cost}</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">млрд ₸</p>
        </div>
      </div>

      <h3 className="mt-4 text-[17px] font-semibold leading-snug text-ink">{measure.name}</h3>
      <p className="mt-1.5 text-sm leading-6 text-muted">{blurb}</p>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">
          {CATEGORY_LABELS[measure.category]}
        </span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">
          {isDistrict ? "Один район" : "Весь город"}
        </span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">
          Эффект через {measure.lag} кв.
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(measure.effects).map(([key, value]) => (
          <span
            key={key}
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
              (value ?? 0) < 0 ? "bg-rose/10 text-rose" : "bg-green-soft text-green-dark",
            )}
          >
            {formatDelta(value ?? 0, 0)} {INDICATOR_SHORT_LABELS[key as keyof typeof INDICATOR_SHORT_LABELS]}
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">AI Impact Preview</p>
        <p className="mt-1 text-xs leading-5 text-ink">{preview.summary}</p>
      </div>

      {isDistrict && !selected ? (
        <div className="mt-4">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted">
            <MapPin className="h-3.5 w-3.5" /> Где строим?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DISTRICTS.map((district) => {
              const conflict = districtConflictHint(decisions, measure, district.id);
              const active = districtId === district.id;
              return (
                <button
                  key={district.id}
                  type="button"
                  disabled={Boolean(conflict) || unavailableAnywhere}
                  title={conflict ?? undefined}
                  onClick={() => setDistrictId(active ? undefined : district.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    active
                      ? "border-green bg-green text-white"
                      : "border-line text-ink hover:border-green/60",
                    conflict && "cursor-not-allowed line-through opacity-40",
                    unavailableAnywhere && "cursor-not-allowed",
                  )}
                >
                  {district.nameRu}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-auto pt-5">
        {selected ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRemove}
              className="h-11 flex-1 rounded-xl border border-rose/30 text-sm font-semibold text-rose transition hover:bg-rose/5"
            >
              Отменить
            </button>
            <div className="flex h-11 flex-[1.3] items-center justify-center gap-1.5 rounded-xl bg-green-soft text-sm font-semibold text-green-dark">
              <Check className="h-4 w-4" />
              {selected.scope === "district"
                ? DISTRICTS_BY_ID[selected.districtId].nameRu
                : "Весь город"}
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={Boolean(blocked)}
            onClick={choose}
            className="h-11 w-full rounded-xl bg-green text-sm font-semibold text-white transition hover:bg-green-dark disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
          >
            {needsDistrict ? "Выберите район" : "Выбрать"}
          </button>
        )}
        {hardBlocked ? (
          <p className="mt-2 text-xs leading-5 text-muted">{blocked}</p>
        ) : null}
      </div>
    </article>
  );
}
