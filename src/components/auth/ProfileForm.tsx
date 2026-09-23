"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";
import type { PublicUser } from "@/lib/auth-schema";
import { accountButtonClass, accountInputClass } from "./AuthForm";

export function ProfileForm({ user: initialUser }: { user: PublicUser }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [busy, setBusy] = useState<"save" | "logout" | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy("save"); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: data.get("displayName"), bio: data.get("bio") }),
      });
      const result = await response.json();
      if (response.status === 401) { router.replace("/login"); router.refresh(); return; }
      if (!response.ok) throw new Error(result.error);
      setUser(result.user); setSaved(true); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Не удалось сохранить профиль."); }
    finally { setBusy(null); }
  }

  async function logout() {
    if (busy) return;
    setBusy("logout"); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Не удалось выйти. Попробуйте ещё раз.");
      router.replace("/"); router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Нет связи с сервером.");
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-semibold text-emerald-800" aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</div>
      <h1 className="text-3xl font-semibold tracking-tight">Мой профиль</h1>
      <p className="mt-2 break-all text-sm text-slate-600">@{user.login}</p>
      <p className="mt-2 text-xs text-slate-500">С нами с {new Date(user.createdAt).toLocaleDateString("ru-RU", { timeZone: "UTC" })}</p>
      <form onSubmit={save} onChange={() => setSaved(false)} className="mt-7 space-y-5" aria-busy={busy === "save"}>
        <fieldset disabled={busy !== null} className="space-y-5">
          <label className="block text-sm font-medium" htmlFor="profile-name">Ваше имя
            <input id="profile-name" name="displayName" className={accountInputClass} value={user.displayName} onChange={(event) => setUser({ ...user, displayName: event.target.value })} autoComplete="name" required maxLength={60} />
          </label>
          <label className="block text-sm font-medium" htmlFor="profile-bio">О себе
            <textarea id="profile-bio" name="bio" className={`${accountInputClass} resize-y`} value={user.bio} onChange={(event) => setUser({ ...user, bio: event.target.value })} rows={4} maxLength={500} placeholder="Расскажите немного о себе" />
            <span className="mt-1 block text-right text-xs font-normal text-slate-500">{user.bio.length} / 500</span>
          </label>
        </fieldset>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {saved && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Профиль сохранён.</p>}
        <button disabled={busy !== null} className={accountButtonClass} type="submit">{busy === "save" && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy === "save" ? "Сохраняем…" : "Сохранить изменения"}</button>
      </form>
      <button type="button" onClick={logout} disabled={busy !== null} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d8e0d6] px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"><LogOut className="h-4 w-4" />{busy === "logout" ? "Выходим…" : "Выйти из аккаунта"}</button>
    </>
  );
}
