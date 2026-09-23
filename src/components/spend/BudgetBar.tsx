import { REQUIRED_DECISIONS } from "@/domain/constants";
import { formatTengeFull } from "@/lib/money";
import { cn, formatDelta, formatScore } from "@/lib/utils";

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
    <div className="simulator-budget-bar">
      <div className="site-container simulator-budget-grid">
        <div className="simulator-budget-cell">
          <p className="simulator-budget-label">Доступно</p>
          <p key={left} className={cn("simulator-budget-value animate-pop", left < 0 && "text-[#ffc5b9]")}>
            {left} <span>млрд ₸</span>
          </p>
          <p className="simulator-budget-detail">
            {formatTengeFull(left)} из {budget} млрд
          </p>
        </div>

        <div className="simulator-budget-cell simulator-decisions-cell">
          <p className="simulator-budget-label">Ваш план</p>
          <p className="simulator-budget-value">{decisions}<span> / {REQUIRED_DECISIONS}<span className="simulator-decision-word"> решений</span></span></p>
          <div className="simulator-decision-steps" aria-label={`${decisions} из ${REQUIRED_DECISIONS} решений`}>
            {Array.from({ length: REQUIRED_DECISIONS }, (_, index) => (
              <span
                key={index}
                className={cn(index < decisions && "is-complete")}
              />
            ))}
          </div>
        </div>

        <div className="simulator-budget-cell simulator-score-cell">
          <p className="simulator-budget-label">Качество жизни</p>
          <p className="simulator-budget-value">
            {formatScore(previewScore ?? baseScore)}
            <span> / 100</span>
          </p>
          <p className="simulator-budget-detail simulator-score-detail">
            {delta === null ? "Стартовый индекс" : `${formatDelta(delta)} к старту`}
          </p>
        </div>
      </div>
    </div>
  );
}
