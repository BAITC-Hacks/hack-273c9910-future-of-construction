import { Check, MapPin } from "lucide-react";
import { INDICATOR_SHORT_LABELS } from "@/domain/constants";
import type { DistrictId, DistrictSnapshot } from "@/domain/types";
import { cn, formatDelta, formatScore } from "@/lib/utils";

export function DistrictStrip({
  before,
  after,
  selectedDistrictId,
  onSelectDistrict,
}: {
  before: DistrictSnapshot[];
  after: DistrictSnapshot[];
  selectedDistrictId?: DistrictId;
  onSelectDistrict?: (districtId: DistrictId) => void;
}) {
  return (
    <div className="simulator-district-grid">
      {after.map((district) => {
        const base = before.find((item) => item.id === district.id);
        const delta = base ? district.score - base.score : 0;
        const critical = district.criticalIndicators;
        const selected = selectedDistrictId === district.id;
        return (
          <button
            key={district.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelectDistrict?.(district.id)}
            className={cn("simulator-district-card", selected && "is-selected")}
          >
            <div className="simulator-district-name">
              <span>{district.nameRu}</span>
              <span className="simulator-district-marker">{selected ? <Check size={13} /> : <MapPin size={13} />}</span>
            </div>
            <div className="simulator-district-score">{formatScore(district.score)}<span>/ 100</span></div>
            <div className="simulator-district-meter" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, district.score))}%` }} /></div>
            <div
              className={cn(
                "simulator-district-delta",
                delta > 0.0001 ? "text-green" : "text-muted",
              )}
            >
              <span>{delta > 0.0001 ? `${formatDelta(delta)} к старту` : "Стартовая оценка"}</span>
              <span title="Доля жителей города">{Math.round(district.populationShare * 100)}% жителей</span>
            </div>
            <div
              className={cn(
                "simulator-district-health",
                critical.length > 0 ? "text-rose" : "text-muted",
              )}
            >
              {critical.length > 0
                ? `Критично: ${critical.map((key) => INDICATOR_SHORT_LABELS[key]).join(", ")}`
                : "Стабильные показатели"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
