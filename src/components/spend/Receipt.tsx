import { Receipt as ReceiptIcon } from "lucide-react";
import { BUDGET, REQUIRED_DECISIONS } from "@/domain/constants";
import type { Decision } from "@/domain/types";
import { DISTRICTS_BY_ID } from "@/data/districts";
import { MEASURES_BY_ID } from "@/data/measures";

export function Receipt({
  decisions,
  spent,
  onFinish,
  onReset,
}: {
  decisions: Decision[];
  spent: number;
  onFinish: () => void;
  onReset: () => void;
}) {
  const ready = decisions.length === REQUIRED_DECISIONS;

  return (
    <section className="mx-auto w-full max-w-md">
      <div className="panel rounded-2xl px-6 py-7">
        <div className="flex flex-col items-center text-center">
          <ReceiptIcon className="h-6 w-6 text-green" />
          <h2 className="mt-2 text-xl font-bold text-ink">Ваш чек решений</h2>
          <p className="text-sm text-muted">Бюджет города Астаны · {BUDGET} единиц</p>
        </div>

        <div className="my-5 border-t border-dashed border-line-strong" />

        {decisions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            Пока пусто. Выберите {REQUIRED_DECISIONS} мер выше.
          </p>
        ) : (
          <ul className="space-y-3">
            {decisions.map((decision) => {
              const measure = MEASURES_BY_ID[decision.measureId];
              return (
                <li key={decision.measureId} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium text-ink">{measure.name}</p>
                    <p className="text-xs text-muted">
                      {decision.scope === "city"
                        ? "Весь город"
                        : DISTRICTS_BY_ID[decision.districtId].nameRu}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums text-ink">{measure.cost}</p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="my-5 border-t border-dashed border-line-strong" />

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Решений</span>
            <span className="font-semibold tabular-nums">
              {decisions.length} / {REQUIRED_DECISIONS}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Остаток</span>
            <span className="font-semibold tabular-nums">{BUDGET - spent}</span>
          </div>
          <div className="flex justify-between pt-1 text-base">
            <span className="font-bold">Итого</span>
            <span className="font-bold tabular-nums text-green-dark">{spent}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={!ready}
          onClick={onFinish}
          className="mt-6 h-12 w-full rounded-xl bg-green text-sm font-semibold text-white transition hover:bg-green-dark disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
        >
          {ready ? "Завершить управление" : `Осталось выбрать ${REQUIRED_DECISIONS - decisions.length}`}
        </button>
        {decisions.length > 0 ? (
          <button
            type="button"
            onClick={onReset}
            className="mt-2 h-10 w-full rounded-xl text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            Начать заново
          </button>
        ) : null}
        <p className="mt-4 text-center text-xs leading-5 text-muted">
          Неиспользованный остаток бонуса не даёт. Порядок решений не важен.
        </p>
      </div>
    </section>
  );
}
