import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./SiteHeader";

export function SiteFooter() {
  return <footer className="site-footer"><div className="site-container footer-inner"><Brand /><p>Хорошие решения. Лучшие города.</p><Link href="/map">Создано для Казахстана <ArrowUpRight size={15} /></Link><span>HackAlem · 2026</span></div></footer>;
}
