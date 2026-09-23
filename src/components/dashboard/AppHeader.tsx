"use client";

import Link from "next/link";
import { BUDGET, REQUIRED_DECISIONS } from "@/domain/constants";
import { formatScore } from "@/lib/utils";

export function AppHeader({
  score,
  spent,
  decisions,
}: {
  score: number;
  spent: number;
  decisions: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[#071018]/86 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">HackAlem AI</p>
          <h1 className="font-serif text-2xl leading-tight text-gold-bright">Аким на 5 часов</h1>
          <p className="text-sm text-muted">AI-симулятор управленческих решений</p>
        </Link>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Astana Quality of Life" value={formatScore(score)} />
          <Metric label="Budget" value={`${BUDGET - spent} / ${BUDGET}`} />
          <Metric label="Decisions" value={`${decisions} / ${REQUIRED_DECISIONS}`} />
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel min-w-[160px] rounded-2xl px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl text-gold-bright">{value}</p>
    </div>
  );
}
