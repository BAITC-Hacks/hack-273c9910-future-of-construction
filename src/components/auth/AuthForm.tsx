"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

export const accountInputClass = "mt-2 w-full rounded-xl border border-[#c9d4c8] bg-white px-4 py-3 text-base text-[#102019] outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:opacity-60";
export const accountButtonClass = "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e3124] px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const register = mode === "register";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const data = new FormData(event.currentTarget);
    if (register && data.get("password") !== data.get("confirmPassword")) {
      setError("Пароли не совпадают.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: data.get("login"), password: data.get("password"), displayName: data.get("displayName") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось войти. Попробуйте снова.");
      router.replace("/profile");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Нет связи с сервером. Попробуйте ещё раз.");
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{register ? "Создать профиль" : "С возвращением"}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{register ? "Выберите логин и пароль для своего аккаунта." : "Войдите в свой аккаунт по логину и паролю."}</p>
      <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={busy}>
        <fieldset disabled={busy} className="space-y-5">
          {register && <label className="block text-sm font-medium" htmlFor="displayName">Ваше имя
            <input className={accountInputClass} id="displayName" name="displayName" autoComplete="name" required maxLength={60} placeholder="Как к вам обращаться" />
          </label>}
          <label className="block text-sm font-medium" htmlFor="login">Логин
            <input className={accountInputClass} id="login" name="login" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" placeholder="Например, astana_user" aria-describedby={register ? "login-hint" : undefined} />
            {register && <span id="login-hint" className="mt-2 block text-xs font-normal text-slate-500">3–30 символов: латинские буквы, цифры и _.</span>}
          </label>
          <div>
            <label className="block text-sm font-medium" htmlFor="password">Пароль</label>
            <div className="relative">
              <input className={`${accountInputClass} pr-12`} id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 8 : 1} maxLength={128} aria-describedby={register ? "password-hint" : undefined} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-5 rounded p-1 text-slate-500 hover:text-emerald-700" aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"} aria-pressed={showPassword}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {register && <p id="password-hint" className="mt-2 text-xs text-slate-500">Не менее 8 символов.</p>}
          </div>
          {register && <label className="block text-sm font-medium" htmlFor="confirmPassword">Повторите пароль
            <input className={accountInputClass} id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} />
          </label>}
        </fieldset>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className={accountButtonClass}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {busy ? "Подождите…" : register ? "Создать аккаунт" : "Войти"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {register ? "Уже есть аккаунт? " : "Нет аккаунта? "}
        <Link href={register ? "/login" : "/register"} className="font-semibold text-emerald-800 underline underline-offset-4">{register ? "Войти" : "Зарегистрироваться"}</Link>
      </p>
    </>
  );
}
