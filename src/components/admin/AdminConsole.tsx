"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { BUDGET, CATEGORY_LABELS, INDICATOR_LABELS, REQUIRED_DECISIONS, SIMULATION_HORIZON } from "@/domain/constants";
import { CATEGORIES, type Category, type IndicatorKey } from "@/domain/types";
import { MEASURES } from "@/data/measures";
import { realizedEffect } from "@/engine/effects";
import { formatDelta } from "@/lib/utils";

export function AdminConsole() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const visible = useMemo(() => MEASURES.filter((measure) =>
    (measure.name.toLowerCase().includes(query.toLowerCase()) || measure.id.toLowerCase().includes(query.toLowerCase())) &&
    (category === "all" || measure.category === category)), [query, category]);

  return <main className="min-h-screen bg-[#f4f7f2] text-[#102019]">
    <header className="border-b border-line bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted"><ArrowLeft className="h-4 w-4" /> На главную</Link>
      <Link href="/simulator" className="rounded-xl bg-green-dark px-4 py-2.5 text-sm font-semibold text-white">Открыть симулятор</Link>
    </div></header>
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-green-dark"><BookOpen className="h-4 w-4" /> Правила модели</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Каталог городских инициатив</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">Все команды получают одинаковые исходные данные и {BUDGET} условных единиц. Выберите ровно {REQUIRED_DECISIONS} разных мер, не больше двух одного направления. Каталог фиксирован по условиям задания.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Rule title="Эффект за два года" text={`Полный эффект × (${SIMULATION_HORIZON} − лаг) / ${SIMULATION_HORIZON}. Показатели ограничены диапазоном 0–100; больше — лучше.`} />
        <Rule title="Несовместимости" text="M1 и M3 нельзя сочетать. M4 с M7 и M5 с M13 нельзя размещать в одном районе." />
        <Rule title="Синергии" text="M1 + M2: T1 +2; M10 + M12: B1 +2; M5 + M6: E2 +2. Бонус в районе первой меры, без уменьшения на лаг." />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3"><Search className="h-4 w-4 text-muted" /><span className="sr-only">Поиск по каталогу</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название или ID меры" className="h-11 w-full min-w-40 bg-transparent text-sm outline-none" /></label>
        <label className="sr-only" htmlFor="catalog-category">Направление</label><select id="catalog-category" value={category} onChange={(event) => setCategory(event.target.value as Category | "all")} className="rounded-xl border border-line bg-white px-3 text-sm"><option value="all">Все направления</option>{CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}</select>
      </div>
      <p className="mt-4 text-xs text-muted">Найдено: {visible.length} из {MEASURES.length}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{visible.map((measure) => <article key={measure.id} className="panel rounded-2xl p-5">
        <p className="text-xs font-semibold text-green-dark">{measure.id} · {CATEGORY_LABELS[measure.category]} · {measure.scope === "city" ? "Все районы" : "Один район"}</p>
        <h2 className="mt-2 text-lg font-semibold">{measure.name}</h2>
        <p className="mt-2 text-sm text-muted">Стоимость: {measure.cost} усл. ед. · Лаг: {measure.lag} кв.</p>
        <table className="mt-4 w-full text-left text-xs"><caption className="sr-only">Полные и реализованные эффекты {measure.id}</caption><thead><tr className="border-b border-line"><th className="pb-2">Показатель</th><th className="pb-2 text-right">Полный</th><th className="pb-2 text-right">За 8 кв.</th></tr></thead><tbody>{Object.entries(measure.effects).map(([key, value]) => <tr key={key}><td className="py-2 pr-3">{INDICATOR_LABELS[key as IndicatorKey]}</td><td className="text-right tabular-nums">{formatDelta(value ?? 0)}</td><td className="text-right font-semibold tabular-nums">{formatDelta(realizedEffect(value ?? 0, measure.lag))}</td></tr>)}</tbody></table>
      </article>)}</div>
      {visible.length === 0 && <p className="py-10 text-center text-muted">Меры не найдены. Измените поиск или направление.</p>}
    </div>
  </main>;
}

function Rule({ title, text }: { title: string; text: string }) {
  return <section className="panel rounded-2xl p-5"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{text}</p></section>;
}
