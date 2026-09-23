"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Building2, ChevronRight, CircleGauge, Database, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { BUDGET, REQUIRED_DECISIONS } from "@/domain/constants";

const navItems = [
  { href: "#platform", label: "Платформа" },
  { href: "#workflow", label: "Как работает" },
  { href: "#governance", label: "Для акимата" },
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#08120f] text-white">
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
            <Building2 className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/70">HackAlem AI</span>
            <span className="block text-lg font-semibold tracking-tight">ASTANA 2028</span>
          </span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          {navItems.map((item) => <a key={item.href} href={item.href} className="transition hover:text-white">{item.label}</a>)}
        </div>
        <Link href="/simulator" className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-bold text-[#08120f] transition hover:bg-emerald-200">
          Запустить симулятор <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-28 lg:pt-28">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative">
          <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200"><Sparkles className="h-4 w-4" /> Цифровой двойник управленческих решений</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-balance sm:text-6xl lg:text-8xl">Город, который помнит каждое решение.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">AI Urban Decision Lab помогает акимату видеть последствия инвестиций до того, как они станут городской реальностью.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/simulator" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#08120f] transition hover:bg-emerald-100"><CircleGauge className="h-4 w-4" /> Открыть рабочий стол</Link>
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"><SlidersHorizontal className="h-4 w-4" /> Консоль администратора</Link>
          </div>
          <div className="mt-12 flex flex-wrap gap-8 border-t border-white/10 pt-6 text-sm text-slate-400">
            <span><strong className="text-2xl text-white">{BUDGET}</strong> млрд ₸ базовый бюджет</span>
            <span><strong className="text-2xl text-white">{REQUIRED_DECISIONS}</strong> решений в сценарии</span>
            <span><strong className="text-2xl text-white">10</strong> индикаторов качества жизни</span>
          </div>
        </div>
        <div className="relative lg:pt-10">
          <div className="absolute -inset-5 rounded-[2rem] border border-emerald-300/10 bg-emerald-300/5 blur-sm" />
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#10211b] shadow-2xl shadow-emerald-950/50">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">City command center</span><span className="flex items-center gap-2 text-xs text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Live model</span></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <DashboardStat icon={<BarChart3 />} label="Quality of Life" value="68.4" delta="+15.8" />
              <DashboardStat icon={<ShieldCheck />} label="Critical indicators" value="03" delta="−42%" />
              <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:col-span-2"><div className="mb-5 flex items-center justify-between"><span className="text-sm text-slate-300">Городской баланс</span><span className="text-xs text-emerald-300">8 кварталов</span></div><div className="flex h-36 items-end gap-2">{[35, 48, 42, 61, 55, 68, 64, 82].map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-500/40 to-emerald-200" style={{ height: `${height}%` }} />)}</div><div className="mt-3 flex justify-between text-[10px] text-slate-500"><span>Q1</span><span>Q4</span><span>Q8</span></div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:col-span-2"><div className="flex items-start gap-3"><span className="mt-0.5 text-amber-300"><Database className="h-4 w-4" /></span><div><p className="text-sm font-semibold">AI рекомендует усилить связку</p><p className="mt-1 text-xs leading-5 text-slate-400">«Безопасные переходы» + «умные светофоры» снижают риск в Сарыарке.</p></div><ChevronRight className="ml-auto h-4 w-4 text-slate-500" /></div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="border-t border-white/10 bg-[#f3f5f0] px-6 py-20 text-[#102019] lg:px-10"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Единый контур управления</p><h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">От бюджета до измеримого результата в одном окне.</h2><div className="mt-12 grid gap-4 md:grid-cols-3"><InfoCard icon={<CircleGauge />} title="Сценарии до запуска" text="Проверяйте решения на цифровой модели районов, бюджета и временного лага." /><InfoCard icon={<BarChart3 />} title="Язык показателей" text="Вместо общих обещаний — 10 индикаторов, понятный score и карта слабых мест." /><InfoCard icon={<Database />} title="Контроль конфигурации" text="Администратор управляет каталогом мер, стоимостью, приоритетами и доступностью." /></div></div></section>
      <section id="workflow" className="bg-[#e8eee7] px-6 py-16 lg:px-10"><div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3"><Step number="01" title="Соберите портфель" text="Выберите меры и задайте желаемый бюджет под конкретную повестку." /><Step number="02" title="Сравните последствия" text="Модель покажет эффект по районам, задержку результата и opportunity cost." /><Step number="03" title="Зафиксируйте курс" text="Получите понятный управленческий отчёт и сохраните сценарий для команды." /></div></section>
      <footer id="governance" className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-10"><span>ASTANA 2028 · AI Urban Decision Lab</span><div className="flex gap-5"><Link href="/simulator" className="transition hover:text-emerald-700">Рабочий стол</Link><Link href="/admin" className="transition hover:text-emerald-700">Администрирование</Link></div></footer>
    </main>
  );
}

function DashboardStat({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="flex items-center justify-between text-emerald-300">{icon}<span className="text-xs text-emerald-300">{delta}</span></div><p className="mt-5 text-3xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>; }
function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <article className="rounded-2xl border border-[#d8e0d6] bg-white p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</div><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>; }
function Step({ number, title, text }: { number: string; title: string; text: string }) { return <div className="border-t border-[#c9d4c8] pt-4"><p className="text-xs font-bold tracking-[0.2em] text-emerald-700">{number}</p><h3 className="mt-5 text-xl font-semibold">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">{text}</p></div>; }
