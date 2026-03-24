"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

function getDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata;
  const full =
    typeof meta?.full_name === "string"
      ? meta.full_name
      : typeof meta?.name === "string"
        ? meta.name
        : null;
  if (full?.trim()) return full.trim();
  if (user.email) return user.email.split("@")[0] ?? "Kullanıcı";
  return "Kullanıcı";
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const run = () => {
      void (async () => {
        const { client } = getSupabaseClient();
        if (!client) {
          setIsLoggedIn(false);
          setUserName("");
          return;
        }
        const {
          data: { user }
        } = await client.auth.getUser();
        setIsLoggedIn(Boolean(user));
        setUserName(user ? getDisplayName(user) : "");
      })();
    };
    const id = window.setTimeout(run, 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  async function handleSignOut() {
    const { client } = getSupabaseClient();
    if (client) await client.auth.signOut();
    setIsLoggedIn(false);
    setUserName("");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/98 backdrop-blur-md shadow-sm shadow-slate-200/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold text-slate-900 transition hover:text-indigo-600"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
            K
          </span>
          <span className="hidden sm:inline">Kariyer Platformu</span>
        </Link>

        <nav className="flex flex-1 items-center justify-end gap-1 sm:gap-3">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Dashboard
          </Link>
          <Link
            href="/profil"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Profilim
          </Link>

          <div className="ml-2 h-6 w-px bg-slate-200" aria-hidden />

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="max-w-[120px] truncate text-sm text-slate-600 sm:max-w-[180px]">
                Merhaba, <span className="font-medium text-slate-900">{userName}</span>
              </span>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                Çıkış Yap
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/giris-yap"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Giriş Yap
              </Link>
              <Link
                href="/kayit-ol"
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
              >
                Kayıt Ol
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
