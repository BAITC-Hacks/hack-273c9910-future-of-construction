import { INDICATOR_SHORT_LABELS } from "@/domain/constants";
import type { DistrictSnapshot } from "@/domain/types";
import { cn, formatDelta, formatScore } from "@/lib/utils";

export function DistrictStrip({
  before,
  after,
}: {
  before: DistrictSnapshot[];
  after: DistrictSnapshot[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {after.map((district) => {
        const base = before.find((item) => item.id === district.id);
        const delta = base ? district.score - base.score : 0;
        const critical = district.criticalIndicators;
        return (
          <div key={district.id} className="panel rounded-2xl p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-ink">{district.nameRu}</p>
              <p className="text-[11px] text-muted" title="Доля жителей города">
                {Math.round(district.populationShare * 100)}%
              </p>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{formatScore(district.score)}</p>
            <p
              className={cn(
                "text-xs font-semibold tabular-nums",
                delta > 0.0001 ? "text-green" : "text-muted",
              )}
            >
              {delta > 0.0001 ? formatDelta(delta) : "без изменений"}
            </p>
            <p
              className={cn(
                "mt-2 text-xs leading-5",
                critical.length > 0 ? "text-rose" : "text-muted",
              )}
            >
              {critical.length > 0
                ? `Критично: ${critical.map((key) => INDICATOR_SHORT_LABELS[key]).join(", ")}`
                : "Нет критичных провалов"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
