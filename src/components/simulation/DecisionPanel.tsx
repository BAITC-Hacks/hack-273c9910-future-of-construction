"use client";

import { BUDGET, REQUIRED_DECISIONS } from "@/domain/constants";
import type { Decision } from "@/domain/types";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { MEASURES_BY_ID } from "@/data/measures";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { totalCostOf } from "@/engine/validator";

export function DecisionPanel({
  decisions,
  onRemove,
  onComplete,
  completing,
}: {
  decisions: Decision[];
  onRemove: (measureId: Decision["measureId"]) => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const spent = totalCostOf(decisions);
  const ready = decisions.length === REQUIRED_DECISIONS;

  return (
    <aside className="panel sticky top-28 rounded-[28px] p-5">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Decision Panel</p>
      <h2 className="mt-1 font-serif text-2xl">Выбрано: {decisions.length} / {REQUIRED_DECISIONS}</h2>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Потрачено</span>
          <span>{spent} / {BUDGET}</span>
        </div>
        <Progress value={spent} max={BUDGET} />
        <div className="flex justify-between">
          <span className="text-muted">Осталось</span>
          <span>{BUDGET - spent}</span>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {decisions.length === 0 ? (
          <p className="text-sm text-muted">Добавьте ровно 5 управленческих решений.</p>
        ) : (
          decisions.map((decision) => {
            const measure = MEASURES_BY_ID[decision.measureId];
            return (
              <div
                key={decision.measureId}
                className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-bg/30 px-3 py-3"
              >
                <div>
                  <p className="text-sm">{measure.name}</p>
                  <p className="text-xs text-muted">
                    {measure.id} · {measure.cost} ед. ·{" "}
                    {decision.scope === "city"
                      ? "весь город"
                      : DISTRICTS_BY_ID[decision.districtId].nameRu}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRemove(decision.measureId)}>
                  Удалить
                </Button>
              </div>
            );
          })
        )}
      </div>

      <Button
        className="mt-5 w-full"
        size="lg"
        disabled={!ready || completing}
        onClick={onComplete}
      >
        {completing ? "Расчёт..." : "Завершить управление"}
      </Button>
      {!ready ? (
        <p className="mt-3 text-xs leading-5 text-muted">
          Официальный Score рассчитывается только после пяти допустимых решений через simulation engine.
        </p>
      ) : null}
    </aside>
  );
}
