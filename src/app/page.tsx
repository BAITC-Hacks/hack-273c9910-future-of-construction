import Link from "next/link";
import { baselineScore } from "@/engine/scoring";
import { formatScore } from "@/lib/utils";

export default function HomePage() {
  const baseline = baselineScore();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.32em] text-gold">HackAlem AI · Astana</p>
      <h1 className="mt-4 max-w-4xl font-serif text-6xl leading-[0.95] text-gold-bright md:text-7xl">
        Аким на 5 часов
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
        AI-симулятор управленческих решений. У вас 100 условных единиц бюджета и ровно 5 решений.
        Числа считает детерминированный simulation engine. LLM только объясняет уже посчитанный результат.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <HeroStat label="Astana Quality of Life" value={formatScore(baseline.finalScore)} />
        <HeroStat label="Budget" value="100" />
        <HeroStat label="Decisions" value="0 / 5" />
      </div>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/simulator"
          className="inline-flex h-12 items-center rounded-full bg-gold px-6 text-sm font-medium text-[#1b1408]"
        >
          Принять полномочия
        </Link>
        <a
          href="#rules"
          className="inline-flex h-12 items-center rounded-full border border-line px-6 text-sm text-ink"
        >
          Правила сценария
        </a>
      </div>

      <section id="rules" className="mt-20 grid gap-4 md:grid-cols-3">
        <Rule
          title="Сначала расчёт"
          text="USER → Validation → Simulation → Score → Structured Result → AI Analyst. LLM не считает показатели и не придумывает значения."
        />
        <Rule
          title="Ровно 5 решений"
          text="Каждую меру — один раз. Не больше двух мер одного направления. Бюджет не выше 100. Неиспользованный остаток не даёт бонус."
        />
        <Rule
          title="Город как система"
          text="Пять районов, десять показателей, лаги, синергии и несовместимости. Порядок выбора не влияет на результат."
        />
      </section>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel rounded-[28px] px-5 py-6">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-4xl text-gold-bright">{value}</p>
    </div>
  );
}

function Rule({ title, text }: { title: string; text: string }) {
  return (
    <div className="panel rounded-[28px] p-5">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
