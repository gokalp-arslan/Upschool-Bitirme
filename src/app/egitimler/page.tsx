"use client";

import BackButton from "@/components/back-button";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Training = {
  id: string;
  title: string;
  link: string;
  price_type: string;
  price_value: number | null;
};

export default function EgitimlerPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
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

    const { data: trainingRows, error: trainingError } = await client
      .from("trainings")
      .select("id, title, link, price_type, price_value")
      .order("created_at", { ascending: false });

    if (trainingError) {
      setErrorMessage("Egitimler yuklenemedi.");
      setLoading(false);
      return;
    }

    setTrainings((trainingRows as Training[]) ?? []);

    if (user) {
      const { data: appRows } = await client
        .from("training_applications")
        .select("training_id")
        .eq("user_id", user.id);
      const ids = new Set((appRows ?? []).map((r: { training_id: string }) => r.training_id));
      setAppliedIds(ids);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(id);
  }, [loadData]);

  async function handleApply(trainingId: string) {
    const { client } = getSupabaseClient();
    if (!client) return;

    const {
      data: { user }
    } = await client.auth.getUser();

    if (!user) {
      setErrorMessage("Basvuru icin giris yapmaniz gerekiyor.");
      return;
    }

    setApplyingId(trainingId);
    setErrorMessage(null);

    const { error } = await client.from("training_applications").insert({
      user_id: user.id,
      training_id: trainingId
    });

    if (error) {
      console.error("Basvuru hatasi:", error);
      setErrorMessage("Basvuru sirasinda bir sorun olustu.");
    } else {
      setAppliedIds((prev) => new Set(prev).add(trainingId));
    }

    setApplyingId(null);
  }

  function formatPrice(t: Training) {
    if (t.price_type === "free") return "Ucretsiz";
    const val = t.price_value;
    return val != null ? `${val} TL` : "Ucretli";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <BackButton />
          <p className="mt-4 text-sm text-slate-600">Egitimler yukleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <BackButton />
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Egitime Basvur</h1>
        <p className="mt-2 text-sm text-slate-600">
          Asagidaki egitimlere basvurabilir veya detay icin linke gidebilirsiniz.
        </p>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {trainings.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Henuz egitim eklenmemis.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {trainings.map((t) => {
              const applied = appliedIds.has(t.id);
              const applying = applyingId === t.id;

              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{t.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{formatPrice(t)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={t.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Egitimi Incele
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleApply(t.id)}
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
