"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type DashboardCard = {
  emoji: string;
  title: string;
  description: string;
  href: string;
};

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    emoji: "👤",
    title: "Profilim",
    description: "Dijital CV ve kisisel bilgileriniz",
    href: "/profil"
  },
  {
    emoji: "📄",
    title: "ATS Uyumlu CV",
    description: "Basvuru sistemlerine uygun ozgecmis",
    href: "/cv-olustur"
  },
  {
    emoji: "📇",
    title: "Dijital Kartvizit",
    description: "QR kod ile kartvizit paylasimi",
    href: "/kartvizit"
  },
  {
    emoji: "📢",
    title: "Ilan Ekle",
    description: "Staj veya egitim ilani olusturun",
    href: "/ilan-ekle"
  },
  {
    emoji: "💼",
    title: "Ilanlara Basvur",
    description: "Staj ve egitim programlarina basvuru",
    href: "/ilanlar"
  }
];

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const run = () => {
      void (async () => {
        const { client } = getSupabaseClient();
        if (!client) {
          setIsLoggedIn(false);
          return;
        }
        const {
          data: { user }
        } = await client.auth.getUser();
        setIsLoggedIn(Boolean(user));
      })();
    };
    const id = window.setTimeout(run, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      setProfileSaved(q.get("profil") === "basarili");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function handleProtectedNavigate(e: React.MouseEvent) {
    if (!isLoggedIn) {
      e.preventDefault();
      router.push("/giris-yap");
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_50%,_#e2e8f0_100%)]">
      <main className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
        {profileSaved ? (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            Profiliniz başarıyla kaydedildi!
          </div>
        ) : null}

        <section className="mb-12 rounded-2xl border border-slate-200/60 bg-white/80 p-8 shadow-sm backdrop-blur sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Hoş geldiniz.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
            Öğrenciler arasındaki yardımlaşma platformuna hoş geldiniz. Paylaşımcı ve
            etkileşimli bu platform tam size göre. Profil, CV, staj ve eğitim
            süreçlerinize hızlı erişim. Kartlara tıklayarak ilgili modüle geçin —
            giriş yapmanız gerekiyorsa otomatik olarak giriş sayfasına
            yönlendirilirsiniz.
          </p>
        </section>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DASHBOARD_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              onClick={handleProtectedNavigate}
              className="group flex min-h-[160px] flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/50"
            >
              <span className="text-3xl" aria-hidden>
                {card.emoji}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 transition group-hover:text-indigo-700">
                {card.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {card.description}
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 transition group-hover:text-indigo-500">
                Aç
                <span className="ml-1 transition group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
