"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Filter, LayoutDashboard, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { CATEGORY_LABELS } from "@/domain/constants";
import { CATEGORIES, type Category, type Measure } from "@/domain/types";
import { MEASURES } from "@/data/measures";
import { ADMIN_MEASURES_KEY } from "@/lib/session";

const emptyMeasure: Measure = { id: "M14", name: "Новое городское мероприятие", category: "services", scope: "city", cost: 10, lag: 2, effects: { C2: 3 } };

export function AdminConsole() {
  const [measures, setMeasures] = useState<Measure[]>(MEASURES);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(ADMIN_MEASURES_KEY);
    if (raw) {
      try { setMeasures(JSON.parse(raw) as Measure[]); } catch { /* keep defaults */ }
    }
  }, []);

  const visible = useMemo(() => measures.filter((measure) => {
    const matchesQuery = measure.name.toLowerCase().includes(query.toLowerCase()) || measure.id.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "all" || measure.category === category);
  }), [category, measures, query]);

  function update(id: string, patch: Partial<Measure>) {
    setMeasures((current) => current.map((measure) => measure.id === id ? { ...measure, ...patch } : measure));
  }
  function add() {
    const id = `M${Date.now().toString().slice(-4)}` as Measure["id"];
    setMeasures((current) => [{ ...emptyMeasure, id }, ...current]);
    setEditing(id);
  }
  function remove(id: string) { setMeasures((current) => current.filter((measure) => measure.id !== id)); }
  function save() { window.localStorage.setItem(ADMIN_MEASURES_KEY, JSON.stringify(measures)); setSaved(true); window.setTimeout(() => setSaved(false), 1800); }
  function reset() { setMeasures(MEASURES); window.localStorage.removeItem(ADMIN_MEASURES_KEY); }

  return <main className="min-h-screen bg-[#f4f7f2] text-[#102019]">
    <header className="border-b border-[#dce6da] bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0e3124] text-emerald-200"><LayoutDashboard className="h-5 w-5" /></span><span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">ASTANA 2028</span><span className="block text-lg font-semibold">Пульт администратора</span></span></Link><div className="flex items-center gap-2"><Link href="/simulator" className="rounded-xl border border-[#dce6da] px-4 py-2 text-sm font-semibold transition hover:border-emerald-500">Рабочий стол</Link><Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce6da] text-slate-500 transition hover:text-[#102019]" title="На главную"><ArrowLeft className="h-4 w-4" /></Link></div></div></header>
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Управление конфигурацией</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Каталог мероприятий</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Редактируйте параметры сценариев, стоимости и доступность мер. Конфигурация хранится локально в браузере этого рабочего места.</p></div><div className="flex gap-2"><button type="button" onClick={reset} className="rounded-xl border border-[#dce6da] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600">Сбросить</button><button type="button" onClick={save} className="flex items-center gap-2 rounded-xl bg-[#0e6b4c] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#09553c]">{saved ? <Check className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />} {saved ? "Сохранено" : "Сохранить изменения"}</button></div></div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3"><Kpi label="Всего мер" value={String(measures.length)} /><Kpi label="В каталоге сейчас" value={String(visible.length)} /><Kpi label="Активные категории" value={String(new Set(measures.map((item) => item.category)).size)} /></div>
      <section className="mt-8 overflow-hidden rounded-2xl border border-[#dce6da] bg-white"><div className="flex flex-col gap-3 border-b border-[#e8eee5] p-4 md:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl border border-[#dce6da] px-3"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по названию или ID" className="h-10 w-full bg-transparent text-sm outline-none" /></label><div className="flex items-center gap-2 overflow-auto"><Filter className="h-4 w-4 shrink-0 text-slate-400" /><button type="button" onClick={() => setCategory("all")} className={pill(category === "all")}>Все</button>{CATEGORIES.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={pill(category === item)}>{CATEGORY_LABELS[item]}</button>)}</div><button type="button" onClick={add} className="flex items-center justify-center gap-2 rounded-xl bg-[#102019] px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Добавить меру</button></div><div className="divide-y divide-[#e8eee5]">{visible.map((measure) => <MeasureRow key={measure.id} measure={measure} editing={editing === measure.id} onEdit={() => setEditing(editing === measure.id ? null : measure.id)} onUpdate={(patch) => update(measure.id, patch)} onRemove={() => remove(measure.id)} />)}{visible.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">Ничего не найдено. Измените фильтр или добавьте новую меру.</div> : null}</div></section>
    </div>
  </main>;
}

function MeasureRow({ measure, editing, onEdit, onUpdate, onRemove }: { measure: Measure; editing: boolean; onEdit: () => void; onUpdate: (patch: Partial<Measure>) => void; onRemove: () => void }) {
  return <article className="p-4 transition hover:bg-[#fbfdfb]"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700">{measure.id}</span><div className="min-w-0"><p className="truncate font-semibold">{measure.name}</p><p className="mt-1 text-xs text-slate-500">{CATEGORY_LABELS[measure.category]} · {measure.scope === "city" ? "Весь город" : "Отдельный район"}</p></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[430px]"><Stat label="Стоимость" value={`${measure.cost} млрд`} /><Stat label="Лаг" value={`${measure.lag} кв.`} /><Stat label="Эффекты" value={String(Object.keys(measure.effects).length)} /><button type="button" onClick={onEdit} className="rounded-xl border border-[#dce6da] px-3 py-2 text-sm font-semibold hover:border-emerald-500">{editing ? "Свернуть" : "Изменить"}</button></div><button type="button" onClick={onRemove} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Удалить"><Trash2 className="h-4 w-4" /></button></div>{editing ? <div className="mt-4 grid gap-3 rounded-xl bg-[#f4f7f2] p-4 md:grid-cols-2 lg:grid-cols-4"><Field label="Название"><input value={measure.name} onChange={(event) => onUpdate({ name: event.target.value })} className="field" /></Field><Field label="Категория"><select value={measure.category} onChange={(event) => onUpdate({ category: event.target.value as Category })} className="field">{CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}</select></Field><Field label="Стоимость, млрд ₸"><input type="number" min="1" value={measure.cost} onChange={(event) => onUpdate({ cost: Number(event.target.value) })} className="field" /></Field><Field label="Лаг, кварталы"><input type="number" min="0" max="8" value={measure.lag} onChange={(event) => onUpdate({ lag: Number(event.target.value) })} className="field" /></Field></div> : null}</article>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-semibold text-slate-600">{label}<div className="mt-1">{children}</div></label>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#f4f7f2] px-3 py-2"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }
function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[#dce6da] bg-white p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>; }
function pill(active: boolean) { return `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${active ? "bg-[#102019] text-white" : "text-slate-500 hover:bg-[#f4f7f2]"}`; }
