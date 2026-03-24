"use client";

import BackButton from "@/components/back-button";
import Link from "next/link";

const OPTIONS = [
  {
    emoji: "📢",
    title: "Staj Ilani Ekle",
    description: "Yeni staj ilani olusturun",
    href: "/staj-ekle"
  },
  {
    emoji: "🎓",
    title: "Egitim Ekle",
    description: "Egitim icerigi paylasin",
    href: "/egitim-ekle"
  }
];

export default function IlanEklePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <BackButton />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Ilan Ekle</h1>
        <p className="mt-2 text-sm text-slate-600">
          Staj ilani veya egitim icerigi ekleyebilirsiniz.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((opt) => (
            <Link
              key={opt.href}
              href={opt.href}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
            >
              <span className="text-3xl">{opt.emoji}</span>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{opt.title}</h2>
              <p className="mt-2 flex-1 text-sm text-slate-600">{opt.description}</p>
              <span className="mt-4 text-sm font-medium text-indigo-600">Devam et →</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
