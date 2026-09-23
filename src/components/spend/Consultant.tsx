"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, ChevronRight, LoaderCircle, MessageCircle, X } from "lucide-react";
import type { Decision } from "@/domain/types";
import { consultantResponseSchema, NAVIGATION, type ConsultantAnswer, type NavigationTarget } from "@/lib/consultant";
import { cn } from "@/lib/utils";

type Message = ConsultantAnswer & { role: "user" | "assistant"; source?: "llm" | "local" };
const WELCOME: Message = {
  role: "assistant",
  message: "Привет! Я ваш помощник по городу. Подскажу, как выбрать меры, разобраться с бюджетом и найти нужный раздел. С чего начнём?",
  actions: ["districts", "measures", "receipt"],
};
const SUGGESTIONS = ["Как начать?", "Сколько осталось бюджета?", "Какой район требует внимания?", "Где посмотреть результат?"];

export function Consultant({ decisions, eventId, budget, spent, hasResult, onNavigate }: {
  decisions: Decision[];
  eventId: string | null;
  budget: number;
  spent: number;
  hasResult: boolean;
  onNavigate: (target: NavigationTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const contextKey = JSON.stringify({ decisions, eventId, hasResult });
  const latestContext = useRef(contextKey);

  useEffect(() => {
    latestContext.current = contextKey;
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setError(null);
  }, [contextKey]);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, busy, open]);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  async function send(value: string) {
    const question = value.trim();
    if (!question || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const sentContext = contextKey;
    const history = messages.slice(1).slice(-2).map((item) => ({ role: item.role, content: item.message.slice(0, 400) }));
    setMessages((current) => [...current.slice(-19), { role: "user", message: question, actions: [] }]);
    setDraft("");
    setBusy(true);
    setError(null);
    const timeout = window.setTimeout(() => controller.abort(), 22_000);
    try {
      const response = await fetch("/api/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ message: question, history, decisions, eventId, hasResult }),
      });
      if (!response.ok) throw new Error("Не удалось получить ответ. Попробуйте отправить вопрос ещё раз.");
      const answer = consultantResponseSchema.parse(await response.json());
      if (latestContext.current === sentContext) setMessages((current) => [...current, { role: "assistant", ...answer }]);
    } catch {
      if (latestContext.current === sentContext) {
        setError("Связь с консультантом прервалась. Повторите вопрос — ваш план сохранён.");
        setDraft(question);
      }
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <aside className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[80] md:bottom-6 md:right-6" aria-label="Консультант по сайту">
      {open && (
        <section id="city-consultant" role="dialog" aria-labelledby="consultant-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}
          className="absolute bottom-20 right-0 flex h-[min(620px,calc(100dvh-200px-env(safe-area-inset-bottom)))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_16px_64px_rgba(15,31,23,0.2)] md:h-[min(620px,calc(100dvh-120px))]">
          <header className="flex shrink-0 items-center gap-3 bg-green-dark px-5 py-4 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15"><Bot className="h-6 w-6" /></span>
            <div className="flex-1"><h2 id="consultant-title" className="font-semibold">Городской помощник</h2><p className="text-xs text-white/75">Ваш навигатор по симулятору</p></div>
            <button type="button" onClick={close} aria-label="Закрыть консультанта" className="rounded-full p-2 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"><X className="h-5 w-5" /></button>
          </header>
          <div className="flex shrink-0 justify-between gap-2 border-b border-line bg-surface-2 px-5 py-3 text-xs text-muted">
            <span>Бюджет <b className="text-ink">{budget - spent} / {budget}</b></span>
            <span>Выбрано <b className="text-ink">{decisions.length} / 5</b></span>
          </div>
          <div ref={log} role="log" aria-label="Переписка с консультантом" aria-live="polite" aria-relevant="additions text" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5">
            {messages.map((message, index) => (
              <div key={index} className={cn("flex flex-col items-start", message.role === "user" && "items-end")}>
                <div className={cn("max-w-[95%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6", message.role === "user" ? "rounded-br-sm bg-green-dark text-white" : "rounded-bl-sm bg-surface-2 text-ink")}>
                  {message.message}
                </div>
                {message.source && <p className="mt-1.5 px-1 text-[11px] text-muted">{message.source === "llm" ? "Ответ ИИ · проверяйте рекомендации" : "Справочный режим · без ИИ"}</p>}
                {message.actions.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.actions.filter((target) => target !== "result" || hasResult).map((target) => (
                    <button key={target} type="button" onClick={() => { close(); onNavigate(target); }} className="flex items-center gap-1 rounded-full border border-green/25 px-3 py-1.5 text-xs font-medium text-green-dark transition hover:bg-green-soft focus-visible:outline-2 focus-visible:outline-green">
                      {NAVIGATION[target]}<ChevronRight className="h-3 w-3" />
                    </button>
                  ))}
                </div>}
              </div>
            ))}
            {busy && <p role="status" className="flex items-center gap-2 text-xs text-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Разбираюсь в вашем плане…</p>}
          </div>
          <div className="shrink-0 border-t border-line p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTIONS.map((question) => <button type="button" key={question} disabled={busy} onClick={() => void send(question)} className="shrink-0 rounded-full bg-surface-2 px-3 py-2 text-xs text-green-dark hover:bg-green-soft disabled:opacity-50">{question}</button>)}
            </div>
            {error && <p role="alert" className="mb-2 text-xs text-rose">{error}</p>}
            <form onSubmit={(event) => { event.preventDefault(); void send(draft); }} className="flex items-center gap-2 rounded-2xl border border-line bg-bg px-3 py-2 focus-within:border-green">
              <input ref={input} aria-label="Вопрос консультанту" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={600} placeholder="Спросите о городе или сайте…" className="min-w-0 flex-1 bg-transparent py-1 text-base outline-none placeholder:text-muted sm:text-sm" />
              <button type="submit" aria-label="Отправить вопрос" disabled={busy || !draft.trim()} className="rounded-xl bg-green-dark p-2 text-white transition hover:bg-green disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
            </form>
            <p className="mt-2 text-center text-[10px] text-muted">Ответы учитывают текущий план. Выбор мер остаётся за вами.</p>
          </div>
        </section>
      )}
      <button ref={launcher} type="button" aria-expanded={open} aria-controls="city-consultant" onClick={() => open ? close() : setOpen(true)} className="flex h-14 items-center gap-3 rounded-full border border-white/20 bg-green-dark px-5 text-white shadow-[0_6px_24px_rgba(22,101,52,0.3)] transition hover:bg-green focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green">
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}<span className="text-sm font-semibold">Консультант</span>
      </button>
    </aside>
  );
}
