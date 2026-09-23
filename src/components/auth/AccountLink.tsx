"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import type { PublicUser } from "@/lib/auth-schema";

export function AccountLink({ dark = false }: { dark?: boolean }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store", signal: controller.signal });
        if (response.ok) setUser((await response.json()).user);
      } catch { /* Navigation remains available if the request fails. */ }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, []);
  return (
    <Link href={user || loading ? "/profile" : "/login"} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${dark ? "border-white/20 text-white hover:bg-white/10" : "border-[#c9d4c8] text-emerald-900 hover:bg-emerald-50"}`}>
      <UserRound className="h-4 w-4 shrink-0" />{loading ? "Профиль" : user ? "Мой профиль" : "Войти"}
    </Link>
  );
}
