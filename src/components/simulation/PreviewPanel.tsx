"use client";

import type { SimulationResult } from "@/domain/types";
import { formatDelta, formatScore } from "@/lib/utils";

export function PreviewPanel({ preview }: { preview: SimulationResult | null }) {
  if (!preview || preview.decisions.length === 0) {
    return (
      <div className="panel rounded-[28px] p-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Preview</p>
        <p className="mt-2 text-sm text-muted">
          После каждого допустимого решения здесь появится предварительный эффект. Это не официальный Score.
        </p>
      </div>
    );
  }

  return (
    <div className="panel rounded-[28px] p-5">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Preview изменений</p>
      <p className="mt-2 text-sm text-muted">
        Предварительный расчёт engine по текущему набору. Финальный Score — только после 5 решений.
      </p>
      <div className="mt-4 grid gap-2">
        {preview.comparisons.map((district) => (
          <div key={district.id} className="flex items-center justify-between rounded-xl bg-bg/30 px-3 py-2 text-sm">
            <span>{district.nameRu}</span>
            <span className="text-muted">
              {formatScore(district.scoreBefore)} → {formatScore(district.scoreAfter)}{" "}
              <span className="text-teal">{formatDelta(district.scoreDelta)}</span>
            </span>
          </div>
        ))}
      </div>
      {preview.activatedSynergies.length > 0 ? (
        <p className="mt-3 text-xs text-teal">
          Синергии: {preview.activatedSynergies.map((item) => item.title).join("; ")}
        </p>
      ) : null}
    </div>
  );
}
