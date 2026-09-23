"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Building2, House, Map, SlidersHorizontal, UserRound } from "lucide-react";
import { AccountLink } from "@/components/auth/AccountLink";

const navigation = [
  { href: "/", label: "Обзор", mobile: "Обзор", icon: House },
  { href: "/map", label: "Карта Казахстана", mobile: "Карта", icon: Map },
  { href: "/simulator", label: "Симулятор", mobile: "Симулятор", icon: SlidersHorizontal },
];

export function Brand() {
  return <Link href="/" className="brand" aria-label="Аким — на главную"><span className="brand-icon"><Building2 size={23} strokeWidth={1.6} /></span><span><strong>аким<span className="text-green">.</span></strong><small>ГОРОД НАЧИНАЕТСЯ С ВАС</small></span></Link>;
}

export function SiteHeader() {
  const pathname = usePathname();
  return <>
    <a href="#main-content" className="skip-link">Перейти к содержимому</a>
    <header className="site-header"><div className="site-container header-inner"><Brand />
      <nav className="desktop-nav" aria-label="Основная навигация">{navigation.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "active" : ""}>{label}{href === "/map" && <span className="nav-new">NEW</span>}</Link>)}</nav>
      <div className="header-actions"><AccountLink /><Link href="/simulator" className="button-primary header-cta">Начать проект <ArrowUpRight size={16} /></Link></div>
    </div></header>
    <nav className="mobile-nav" aria-label="Мобильная навигация">{[...navigation, { href: "/profile", label: "Профиль", mobile: "Профиль", icon: UserRound }].map(({ href, mobile, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""} aria-current={pathname === href ? "page" : undefined}><Icon size={21} /><span>{mobile}</span></Link>)}</nav>
  </>;
}
