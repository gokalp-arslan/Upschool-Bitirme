"use client";

import BackButton from "@/components/back-button";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Internship = {
  id: string;
  company_name: string;
  title: string;
  location: string;
  link: string;
};

export default function StajIlanlariPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { client } = getSupabaseClient();
    if (!client) {
      setErrorMessage("Baglanti hatasi.");
      setLoading(false);
      return;
    }

    const {
      data: { user }
    } = await client.auth.getUser();

    const { data: internshipRows, error: internshipError } = await client
      .from("internships")
      .select("id, company_name, title, location, link")
      .order("created_at", { ascending: false });

    if (internshipError) {
      setErrorMessage("Staj ilanlari yuklenemedi.");
      setLoading(false);
      return;
    }

    setInternships((internshipRows as Internship[]) ?? []);

    if (user) {
      const { data: appRows } = await client
        .from("internship_applications")
        .select("internship_id")
        .eq("user_id", user.id);
      const ids = new Set((appRows ?? []).map((r: { internship_id: string }) => r.internship_id));
      setAppliedIds(ids);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(id);
  }, [loadData]);

  async function handleApply(internshipId: string) {
    const { client } = getSupabaseClient();
    if (!client) return;

    const {
      data: { user }
    } = await client.auth.getUser();

    if (!user) {
      setErrorMessage("Basvuru icin giris yapmaniz gerekiyor.");
      return;
    }

    setApplyingId(internshipId);
    setErrorMessage(null);

    const { error } = await client.from("internship_applications").insert({
      user_id: user.id,
      internship_id: internshipId
    });

    if (error) {
      console.error("Basvuru hatasi:", error);
      setErrorMessage("Basvuru sirasinda bir sorun olustu.");
    } else {
      setAppliedIds((prev) => new Set(prev).add(internshipId));
    }

    setApplyingId(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <BackButton />
          <p className="mt-4 text-sm text-slate-600">Staj ilanlari yukleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <BackButton />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Staj Basvurusu</h1>
        <p className="mt-2 text-sm text-slate-600">
          Acik staj pozisyonlarini inceleyebilir ve basvurabilirsiniz.
        </p>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {internships.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Henuz staj ilani eklenmemis.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {internships.map((i) => {
              const applied = appliedIds.has(i.id);
              const applying = applyingId === i.id;

              return (
                <div
                  key={i.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{i.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{i.company_name}</p>
                  <p className="mt-1 text-sm text-slate-500">{i.location}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={i.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Detay
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleApply(i.id)}
                      disabled={applied || applying}
                      className="inline-flex rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {applying ? "Kaydediliyor..." : applied ? "Basvuruldu" : "Basvurdum"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
