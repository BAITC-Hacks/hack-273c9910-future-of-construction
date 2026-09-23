"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Landmark } from "lucide-react";
import { BUDGET, CATEGORY_LABELS, REQUIRED_DECISIONS } from "@/domain/constants";
import { CATEGORIES } from "@/domain/types";
import type { Category, Decision, SimulationResult } from "@/domain/types";
import { MEASURES } from "@/data/measures";
import { baselineDistricts, previewDecisions, simulateDecisions } from "@/engine/simulation";
import { baselineScore } from "@/engine/scoring";
import { totalCostOf, validateDecisions } from "@/engine/validator";
import { clearSession, loadDecisions, saveDecisions } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BudgetBar } from "./BudgetBar";
import { DistrictStrip } from "./DistrictStrip";
import { MeasureTile } from "./MeasureTile";
import { Receipt } from "./Receipt";
import { ResultPanel } from "./ResultPanel";

const BASELINE = baselineScore().finalScore;
const BASE_DISTRICTS = baselineDistricts();

export function SpendGame() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [category, setCategory] = useState<Category | "all">("all");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const stored = loadDecisions();
    if (validateDecisions(stored, "partial").ok) setDecisions(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDecisions(decisions);
  }, [decisions, hydrated]);

  const preview = useMemo(() => {
    if (decisions.length === 0) return null;
    try {
      return previewDecisions(decisions);
    } catch {
      return null;
    }
  }, [decisions]);

  const spent = totalCostOf(decisions);
  const visible = MEASURES.filter((measure) => category === "all" || measure.category === category);

  function select(decision: Decision) {
    const next = [...decisions, decision];
    if (!validateDecisions(next, "partial").ok) return;
    setResult(null);
    setDecisions(next);
  }

  function remove(measureId: Decision["measureId"]) {
    setResult(null);
    setDecisions((current) => current.filter((item) => item.measureId !== measureId));
  }

  function finish() {
    try {
      setResult(simulateDecisions(decisions));
      requestAnimationFrame(() =>
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch {
      setResult(null);
    }
  }

  function reset() {
    clearSession();
    setDecisions([]);
    setResult(null);
    setResetKey((key) => key + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="mx-auto flex max-w-3xl flex-col items-center px-5 pb-10 pt-14 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green">
          HackAlem AI · Астана
        </p>
        <div className="mt-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-green to-green-dark text-white shadow-[0_12px_40px_rgba(22,163,74,0.35)]">
          <Landmark className="h-12 w-12" strokeWidth={1.6} />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink md:text-6xl">
          Аким на 5 часов
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted md:text-lg">
          У вас {BUDGET} единиц городского бюджета и ровно {REQUIRED_DECISIONS} решений.
          Потратьте их так, чтобы жизнь в Астане стала лучше для всех районов — особенно для самых слабых.
        </p>
      </header>

      <BudgetBar
        spent={spent}
        decisions={decisions.length}
        baseScore={BASELINE}
        previewScore={preview ? preview.finalScore : null}
      />

      <main className="mx-auto max-w-6xl space-y-12 px-5 pt-10">
        <section>
          <SectionTitle title="Город сейчас" hint="Оценка каждого района от 0 до 100 обновляется после каждого решения." />
          <DistrictStrip before={BASE_DISTRICTS} after={preview?.districtsAfter ?? BASE_DISTRICTS} />
        </section>

        <section>
          <SectionTitle
            title="Что финансируем?"
            hint="Не больше двух мер одного направления. Эффект мер с долгим запуском за 8 кварталов проявится не полностью."
          />
          <div className="mb-5 flex flex-wrap gap-2">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>
              Все меры
            </Chip>
            {CATEGORIES.map((item) => (
              <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
                {CATEGORY_LABELS[item]}
              </Chip>
            ))}
          </div>
          <div key={resetKey} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((measure) => (
              <MeasureTile
                key={measure.id}
                measure={measure}
                decisions={decisions}
                selected={decisions.find((item) => item.measureId === measure.id)}
                onSelect={select}
                onRemove={() => remove(measure.id)}
              />
            ))}
          </div>
        </section>

        <Receipt decisions={decisions} spent={spent} onFinish={finish} onReset={reset} />

        {result ? <ResultPanel result={result} onReset={reset} /> : null}
      </main>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        active ? "border-green bg-green text-white" : "border-line bg-surface text-ink hover:border-green/60",
      )}
    >
      {children}
    </button>
  );
}
