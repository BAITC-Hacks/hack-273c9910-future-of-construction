import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f3f5f0] px-5 py-8 text-[#102019] sm:py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-700">
          <ArrowLeft className="h-4 w-4" /> На главную
        </Link>
        <div className="rounded-3xl border border-[#d8e0d6] bg-white p-6 shadow-sm sm:p-9">
          <Link href="/" className="mb-8 flex items-center gap-3 font-semibold tracking-tight">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0e3124] text-emerald-200"><Building2 className="h-5 w-5" /></span>
            ASTANA 2028
          </Link>
          {children}
        </div>
        <Link href="/simulator" className="mt-6 block text-center text-sm text-slate-600 underline underline-offset-4 hover:text-emerald-700">Перейти к симулятору</Link>
      </div>
    </main>
  );
}
