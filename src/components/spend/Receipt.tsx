import { useState } from "react";
import { BriefcaseBusiness, Loader2, Receipt as ReceiptIcon, ShieldCheck, Users } from "lucide-react";
import { CATEGORY_LABELS, REQUIRED_DECISIONS } from "@/domain/constants";
import { CATEGORIES } from "@/domain/types";
import type { Decision } from "@/domain/types";
import { DISTRICTS_BY_ID } from "@/data/districts";
import type { CityEvent } from "@/data/events";
import { MEASURES_BY_ID } from "@/data/measures";
import { cn } from "@/lib/utils";

const AVATARS = [
  { id: "akim", label: "Аким", icon: BriefcaseBusiness },
  { id: "analyst", label: "Аналитик", icon: ShieldCheck },
  { id: "team", label: "Команда", icon: Users },
] as const;

export function Receipt({
  decisions,
  spent,
  budget,
  event,
  team,
  busy,
  onTeamChange,
  onFinish,
  onReset,
}: {
  decisions: Decision[];
  spent: number;
  budget: number;
  event: CityEvent | null;
  team: string;
  busy: boolean;
  onTeamChange: (team: string) => void;
  onFinish: () => void;
  onReset: () => void;
}) {
  const [avatar, setAvatar] = useState<(typeof AVATARS)[number]["id"]>("akim");
  const overBudget = spent > budget;
  const ready = decisions.length === REQUIRED_DECISIONS && !overBudget;
  const covered = new Set(decisions.map((decision) => MEASURES_BY_ID[decision.measureId].category));

  return (
    <section className="simulator-receipt mx-auto w-full max-w-xl">
      <div className="panel rounded-3xl px-5 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col items-center text-center">
          <ReceiptIcon className="h-6 w-6 text-green" />
          <h2 className="mt-2 text-xl font-bold text-ink">Ваш чек решений</h2>
          <p className="mt-1 text-sm text-muted">Бюджет сценария · {budget} млрд ₸</p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {AVATARS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAvatar(id)}
              aria-pressed={avatar === id}
              className={cn(
                "rounded-xl border px-2 py-2 text-center transition",
                avatar === id ? "border-green bg-green-soft text-green-dark" : "border-line bg-surface-2 text-muted",
              )}
            >
              <Icon className="mx-auto h-4 w-4" />
              <span className="mt-1 block text-[11px] font-medium">{label}</span>
            </button>
          ))}
        </div>

        <label className="mt-5 flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 focus-within:border-green">
          <Users className="h-4 w-4 text-muted" />
          <input
            value={team}
            onChange={(event) => onTeamChange(event.target.value)}
            placeholder="Название команды"
            aria-label="Название команды"
            maxLength={40}
            className="w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-muted"
          />
        </label>

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
                      {CATEGORY_LABELS[measure.category]} ·{" "}
                      {decision.scope === "city"
                        ? "Весь город"
                        : DISTRICTS_BY_ID[decision.districtId].nameRu}
                    </p>
                  </div>
                  <p className="whitespace-nowrap font-semibold tabular-nums text-ink">{measure.cost} млрд ₸</p>
                </li>
              );
            })}
            {event ? (
              <li className="flex items-start justify-between gap-4 text-sm text-rose">
                <div>
                  <p className="font-medium">Резерв: {event.title}</p>
                  <p className="text-xs opacity-80">Городское событие</p>
                </div>
                <p className="whitespace-nowrap font-semibold tabular-nums">−{event.reserve} млрд ₸</p>
              </li>
            ) : null}
          </ul>
        )}

        <div className="my-5 border-t border-dashed border-line-strong" />

        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-muted">Направления в плане</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((category) => (
              <span
                key={category}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium",
                  covered.has(category) ? "bg-green-soft text-green-dark" : "bg-surface-2 text-muted",
                )}
              >
                {CATEGORY_LABELS[category]}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Решений</span>
            <span className="font-semibold tabular-nums">
              {decisions.length} / {REQUIRED_DECISIONS}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Доступный лимит</span>
            <span className="font-semibold tabular-nums">{budget} млрд ₸</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Остаток</span>
            <span className={cn("font-semibold tabular-nums", overBudget && "text-rose")}>
              {budget - spent} млрд ₸
            </span>
          </div>
          <div className="flex justify-between pt-1 text-base">
            <span className="font-bold">Итого</span>
            <span className="font-bold tabular-nums text-green-dark">{spent} млрд ₸</span>
          </div>
        </div>

        {overBudget ? (
          <p className="mt-4 rounded-xl bg-rose/10 px-3 py-2 text-xs leading-5 text-rose">
            План превышает доступный бюджет на {spent - budget} млрд ₸. Отмените одну из мер и
            перераспределите средства.
          </p>
        ) : null}

        <button
          type="button"
          disabled={!ready || busy}
          onClick={onFinish}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green text-sm font-semibold text-white transition hover:bg-green-dark disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy
            ? "AI анализирует сценарий…"
            : overBudget
              ? "Превышен бюджет"
              : ready
                ? "Завершить управление"
                : `Осталось выбрать ${REQUIRED_DECISIONS - decisions.length}`}
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
          1 единица модели = 1 млрд ₸. Остаток бонуса не даёт, порядок решений не важен.
        </p>
      </div>
    </section>
  );
}
