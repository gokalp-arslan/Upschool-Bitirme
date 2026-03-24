"use client";

import BackButton from "@/components/back-button";
import { CvPrintDocument, type CvProfile } from "@/components/cv/cv-print-document";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AlertCircle, Download } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

function isProfileReadyForCv(profile: CvProfile | null): profile is CvProfile {
  if (!profile) return false;
  const fn = profile.first_name?.trim();
  const ln = profile.last_name?.trim();
  const uni = profile.university?.trim();
  const dept = profile.department?.trim();
  return Boolean(fn && ln && uni && dept);
}

export default function CvOlusturPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<CvProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const documentTitle = useCallback(() => {
    if (!profile) return "CV";
    const safe = `${profile.first_name}-${profile.last_name}`.replace(/\s+/g, "-");
    return `${safe}-CV`;
  }, [profile]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle,
    pageStyle: `
      @page { size: A4; margin: 14mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { client, error } = getSupabaseClient();
        if (error || !client) {
          if (mounted) setErrorMessage("Bağlantı hatası. Lütfen daha sonra tekrar deneyin.");
          return;
        }

        const {
          data: { user }
        } = await client.auth.getUser();

        if (!user) {
          if (mounted) setNeedsAuth(true);
          return;
        }

        if (mounted) setEmail(user.email ?? null);

        const { data, error: profileError } = await client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          if (mounted) setErrorMessage("Profil bilgisi yüklenirken bir sorun oluştu.");
          return;
        }

        if (mounted) setProfile((data as CvProfile) ?? null);
      } catch {
        if (mounted) setErrorMessage("Profil bilgisi yüklenirken bir sorun oluştu.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const ready = profile !== null && isProfileReadyForCv(profile);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
        <p className="text-sm text-neutral-600">CV hazırlanıyor...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <BackButton />
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorMessage}
          </div>
        </div>
      </main>
    );
  }

  if (needsAuth) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <BackButton />
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-neutral-900">CV oluştur</h1>
            <p className="mt-2 text-neutral-600">CV oluşturmak için giriş yapmanız gerekir.</p>
            <Link
              href="/giris-yap"
              className="mt-6 inline-flex rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Giriş yap
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!profile || !ready) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="print:hidden">
            <BackButton />
          </div>
          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-semibold text-amber-900">Profil bilgilerin eksik</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
                ATS uyumlu CV üretmek için ad, soyad, üniversite ve bölüm alanlarının dolu olması
                gerekir. Profilini tamamladıktan sonra bu sayfaya dönerek PDF indirebilirsin.
              </p>
              <Link
                href="/profil-tamamlama"
                className="mt-4 inline-flex rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-800"
              >
                Profili tamamla
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <BackButton />
          <button
            type="button"
            onClick={() => void handlePrint()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-900 bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            PDF olarak indir
          </button>
        </div>
        <p className="mb-6 text-center text-xs text-neutral-500 print:hidden">
          Tarayıcı yazdırma penceresinde &quot;Hedef&quot; olarak PDF olarak kaydedebilirsin.
        </p>

        <div className="flex justify-center print:block">
          <CvPrintDocument ref={printRef} profile={profile} email={email} />
        </div>
      </div>
    </main>
  );
}
