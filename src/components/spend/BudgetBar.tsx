import { REQUIRED_DECISIONS } from "@/domain/constants";
import { formatTengeFull } from "@/lib/money";
import { formatDelta, formatScore } from "@/lib/utils";

export function BudgetBar({
  spent,
  budget,
  decisions,
  baseScore,
  previewScore,
}: {
  spent: number;
  budget: number;
  decisions: number;
  baseScore: number;
  previewScore: number | null;
}) {
  const left = budget - spent;
  const delta = previewScore === null ? null : previewScore - baseScore;

  return (
    <div className="sticky top-0 z-30 bg-green text-white shadow-[0_6px_20px_rgba(22,101,52,0.18)]">
      <div className="mx-auto grid max-w-6xl grid-cols-3 items-center gap-4 px-5 py-3.5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
            Осталось бюджета
          </p>
          <p key={left} className="animate-pop text-2xl font-bold tabular-nums md:text-4xl">
            {left} <span className="text-base font-semibold text-white/80 md:text-lg">млрд ₸</span>
          </p>
          <p className="hidden text-xs tabular-nums text-white/70 md:block">
            {formatTengeFull(left)} из {budget} млрд
          </p>
        </div>

        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
            Решения
          </p>
          <div className="mt-1.5 flex justify-center gap-1.5">
            {Array.from({ length: REQUIRED_DECISIONS }, (_, index) => (
              <span
                key={index}
                className={`h-2.5 w-5 rounded-full transition md:w-7 ${
                  index < decisions ? "bg-white" : "bg-white/25"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {decisions} / {REQUIRED_DECISIONS}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
            Astana QoL Score
          </p>
          <p className="text-2xl font-bold tabular-nums md:text-4xl">
            {formatScore(previewScore ?? baseScore)}
          </p>
          <p className="text-xs font-medium tabular-nums text-white/80">
            {delta === null ? "старт" : `${formatDelta(delta)} к старту`}
          </p>
        </div>
      </div>
    </div>
  );
}
