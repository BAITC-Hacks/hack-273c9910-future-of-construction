import Link from "next/link";
import { Building2, ArrowLeft, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#dcebdd_0%,#f3f5f0_65%)] px-5 py-8 text-[#102019] sm:py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 rounded-lg text-sm text-slate-600 transition hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> На главную
        </Link>
        <div className="rounded-3xl border border-[#d8e0d6] bg-white p-6 shadow-xl shadow-emerald-950/5 sm:p-9">
          <Link href="/" className="mb-8 flex items-center gap-3 rounded-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0e3124] text-emerald-200"><Building2 aria-hidden="true" className="h-5 w-5" /></span>
            <span>
              <span className="block">ASTANA 2028</span>
              <span className="mt-0.5 block text-xs font-normal tracking-normal text-slate-500">Ваши решения. Будущее города.</span>
            </span>
          </Link>
          {children}
        </div>
        <Link href="/simulator" className="group mt-5 flex items-center gap-4 rounded-2xl border border-[#d8e0d6] bg-white/70 p-5 transition hover:border-emerald-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-emerald-900">Попробовать симулятор</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">Распределите бюджет и посмотрите, как меняется город.</span>
          </span>
          <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />
        </Link>
      </div>
    </main>
  );
}
