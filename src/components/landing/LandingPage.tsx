import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, ChartNoAxesCombined, Check, Compass, Layers3, Leaf, MapPinned, MoveUpRight, Route, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CityIllustration } from "./CityIllustration";
import { YandexMap } from "@/components/map/YandexMap";
import { KAZAKHSTAN } from "@/data/mapPlaces";
import { baselineScore } from "@/engine/scoring";
import { formatDelta, formatScore } from "@/lib/utils";
import { BUDGET, REQUIRED_DECISIONS, SIMULATION_HORIZON } from "@/domain/constants";
import { CONTROL_SCENARIO } from "@/data/examples";
import { simulateDecisions } from "@/engine/simulation";

const demo = simulateDecisions(CONTROL_SCENARIO);

export function LandingPage() {
  return <div className="app-shell"><SiteHeader /><main id="main-content">
    <section className="site-container hero-section"><div className="hero-copy"><span className="eyebrow"><span className="status-dot" /> ПЛАТФОРМА ГОРОДСКИХ РЕШЕНИЙ</span><h1>Большие перемены<br />начинаются<br />с <em>вашего решения.</em></h1><p className="hero-description">Каким будет ваш город завтра? Исследуйте районы и распределяйте бюджет. Учебная модель рассчитает последствия ваших решений, а аналитик объяснит сильные стороны, риски и компромиссы плана.</p><div className="hero-buttons"><Link href="/simulator" className="button-primary">Стать акимом <ArrowUpRight size={18} /></Link><Link href="/map" className="button-secondary"><MapPinned size={18} /> Исследовать карту</Link></div><div className="hero-footnote"><span className="hero-avatars"><span>А</span><span>Қ</span><span>М</span></span><span>Ваш город. Ваши приоритеты.<br /><strong>{REQUIRED_DECISIONS} решений, которые имеют значение.</strong></span></div></div>
      <div className="hero-visual"><div className="visual-topline"><span><span className="status-dot" /> АСТАНА, КАЗАХСТАН</span><Compass size={20} strokeWidth={1.3} /></div><CityIllustration /><div className="city-label"><MapPinned size={13} /> Астана · город возможностей</div><div className="floating-card quality-card"><span className="small-icon"><ChartNoAxesCombined size={18} /></span><div><small>Качество жизни · модель</small><strong>{formatScore(baselineScore().finalScore)} <span>/ 100</span></strong></div><span className="mini-chart"><i /><i /><i /><i /><i /></span></div><div className="floating-card idea-card"><span className="small-icon"><Leaf size={20} /></span><div><strong>Больше зелени. Больше жизни.</strong><small>Начните с парка в своём районе</small></div></div><div className="visual-caption"><span>01 / ГОРОД, КОТОРЫЙ ВЫ СОЗДАЁТЕ</span><span>ПЛАНИРУЙТЕ СМЕЛЕЕ <MoveUpRight size={12} /></span></div></div>
    </section>
    <section className="site-container"><div className="stats-ribbon"><div className="stats-intro"><span className="small-icon"><Layers3 size={23} /></span><span>Сложный город.<br /><strong>Понятные решения.</strong></span></div>{[{v:String(BUDGET),u:"усл. ед.",l:"бюджет вашего сценария"},{v:"5",u:"районов",l:"разные потребности людей"},{v:"14",u:"инициатив",l:"от парков до новых школ"},{v:"10",u:"показателей",l:"измеримый эффект решений"}].map(item=><div key={item.l} className="ribbon-stat"><strong>{item.v} <span>{item.u}</span></strong><small>{item.l}</small></div>)}</div></section>
    <section className="site-container landing-map-section" id="platform"><div className="section-heading"><div><span className="eyebrow">01 — ИССЛЕДУЙТЕ</span><h2>Вся страна. <em>Ближе, чем кажется.</em></h2><p>Посмотрите на город с новой стороны — найдите место для следующей идеи.</p></div><Link href="/map" className="text-link">Открыть карту <ArrowUpRight size={18} /></Link></div><div className="landing-map-grid"><div className="landing-map-frame"><div className="map-preview-header"><span><MapPinned size={16} /> Казахстан</span><span className="subtle-badge">Яндекс Карты</span></div><YandexMap place={KAZAKHSTAN} /></div><div className="map-feature-panel"><span className="icon-large"><Compass size={27} strokeWidth={1.5} /></span><h3>У каждого места<br />есть потенциал.</h3><p>Переключайтесь между городами и районами. Сохраняйте места, которые заслуживают внимания.</p><ul><li><Check size={16} /> Карта, спутник и дорожная обстановка</li><li><Check size={16} /> Избранные места и ваши заметки</li><li><Check size={16} /> От района на карте — к плану действий</li></ul><Link href="/map" className="button-primary">Найти свою точку на карте <ArrowRight size={17} /></Link><small>Карта реальная. Показатели районов — учебная модель.</small></div></div></section>
    <section id="workflow" className="workflow-section"><div className="site-container"><div className="section-heading"><div><span className="eyebrow">02 — МЕНЯЙТЕ</span><h2>От «а что, если» <em>к результату.</em></h2></div><p>Не нужно быть урбанистом.<br />Достаточно заботиться о своём городе.</p></div><div className="workflow-grid">{[{n:"01",icon:MapPinned,title:"Узнайте свой город",text:"Исследуйте карту и показатели районов. Найдите, где перемены нужнее всего.",tag:"Начните с любопытства"},{n:"02",icon:Route,title:"Расставьте приоритеты",text:`Новая школа, зелёный парк или удобный транспорт? Выберите ${REQUIRED_DECISIONS} мер и уложитесь в бюджет ${BUDGET} условных единиц.`,tag:"Каждое решение имеет значение"},{n:"03",icon:ChartNoAxesCombined,title:"Посмотрите в будущее",text:"Запустите симуляцию. Сравните изменения и получите объяснение результатов от AI-аналитика.",tag:"Решения, подкреплённые данными"}].map(({n,icon:Icon,title,text,tag})=><article key={n} className="workflow-card"><div><span className="small-icon"><Icon size={23} strokeWidth={1.5} /></span><span className="step-number">{n}</span></div><h3>{title}</h3><p>{text}</p><span className="step-tag">{tag} <ArrowUpRight size={14} /></span></article>)}</div></div></section>
    <section className="site-container landing-map-section" aria-labelledby="demo-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">03 — ПРОВЕРЯЙТЕ</span>
          <h2 id="demo-title">Пример из задания. <em>Измеримый результат.</em></h2>
          <p>Синтетические данные · {SIMULATION_HORIZON} кварталов · шкала 0–100. Стоимость контрольного плана — {demo.totalCost} из {BUDGET} условных единиц.</p>
        </div>
        <Link href="/admin" className="text-link">Каталог и правила <ArrowUpRight size={18} /></Link>
      </div>
      <div className="workflow-grid">
        <article className="workflow-card">
          <span className="small-icon"><ChartNoAxesCombined size={23} /></span>
          <h3>Качество жизни</h3>
          <p>Astana Quality of Life Score: {formatScore(demo.finalScore)} · изменение {formatDelta(demo.scoreDelta)}.</p>
          <p>Критические показатели: {demo.scoreBefore.criticalCount} → {demo.criticalIndicators.length}.</p>
        </article>
        <article className="workflow-card">
          <span className="small-icon"><MapPinned size={23} /></span>
          <h3>Районы после симуляции</h3>
          {demo.comparisons.map((district) => <p key={district.id}>{district.nameRu}: {formatScore(district.scoreBefore)} → {formatScore(district.scoreAfter)}</p>)}
        </article>
        <article className="workflow-card">
          <span className="small-icon"><Layers3 size={23} /></span>
          <h3>Синергия контрольного плана</h3>
          <p>M10 + M12 дают дополнительно B1 +2 в Нуре.</p>
          <p>Общий каталог, фиксированный бюджет и объяснимые формулы позволяют проверить каждый результат.</p>
        </article>
      </div>
    </section>
    <section className="site-container"><div className="start-banner"><div><span className="eyebrow"><Sparkles size={15} /> ВАШ СЛЕДУЮЩИЙ ШАГ</span><h2>Город будущего<br />не построит себя сам.</h2><p>Возьмите управление в свои руки. Хотя бы на 5 часов.</p></div><Link href="/simulator" className="button-light">Создать первый сценарий <ArrowUpRight size={19} /></Link><ArrowDown className="banner-decoration" aria-hidden="true" /></div></section>
  </main><SiteFooter /></div>;
}
