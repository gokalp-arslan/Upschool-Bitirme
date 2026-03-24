"use client";

import BackButton from "@/components/back-button";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  LISTING_FORBIDDEN_MESSAGE,
  updateListingAsOwner
} from "@/lib/supabase/listing-owner-mutations";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function EgitimEkleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [priceType, setPriceType] = useState<string>("free");
  const [priceValue, setPriceValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRow, setIsLoadingRow] = useState(Boolean(editId));

  useEffect(() => {
    if (!editId) return;

    let cancelled = false;

    async function load() {
      const { client } = getSupabaseClient();
      if (!client) {
        setErrorMessage("Bağlantı hatası.");
        setIsLoadingRow(false);
        return;
      }

      const {
        data: { user }
      } = await client.auth.getUser();

      if (!user) {
        setErrorMessage("Giriş yapmanız gerekiyor.");
        setIsLoadingRow(false);
        return;
      }

      const { data, error } = await client
        .from("trainings")
        .select("id, title, link, price_type, price_value, added_by")
        .eq("id", editId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setErrorMessage("İlan bulunamadı.");
        setIsLoadingRow(false);
        return;
      }

      if (data.added_by !== user.id) {
        setErrorMessage("Bu ilanı düzenleme yetkiniz yok.");
        setIsLoadingRow(false);
        return;
      }

      setTitle(data.title ?? "");
      setLink(data.link ?? "");
      setPriceType(data.price_type ?? "free");
      setPriceValue(
        data.price_type === "paid" && data.price_value != null
          ? String(data.price_value)
          : ""
      );
      setIsLoadingRow(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const { client, error: clientError } = getSupabaseClient();
      if (clientError || !client) {
        setErrorMessage("Baglanti hatasi. Lutfen tekrar deneyin.");
        return;
      }

      const {
        data: { user },
        error: userError
      } = await client.auth.getUser();

      if (userError || !user?.id) {
        setErrorMessage("Giris yapmaniz gerekiyor. Lutfen giris yapip tekrar deneyin.");
        return;
      }

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setErrorMessage("Egitim basligi zorunludur.");
        return;
      }

      const trimmedLink = link.trim();
      if (!trimmedLink) {
        setErrorMessage("Link alani zorunludur.");
        return;
      }

      const trimmedPrice = priceValue.trim();
      let priceVal: number;
      if (priceType === "paid") {
        const num = Number(trimmedPrice.replace(",", "."));
        if (!Number.isFinite(num) || num < 0) {
          setErrorMessage("Gecerli bir fiyat girin.");
          return;
        }
        priceVal = num;
      } else {
        priceVal = 0;
      }

      const payload = {
        title: trimmedTitle,
        link: trimmedLink,
        price_type: priceType,
        price_value: priceVal
      };

      if (editId) {
        const { error: updateError, forbidden } = await updateListingAsOwner(
          client,
          "trainings",
          editId,
          user.id,
          payload
        );

        if (updateError) {
          console.error("Trainings update hatasi:", updateError);
          setErrorMessage("Kayit sirasinda bir sorun olustu. Lutfen tekrar deneyin.");
          return;
        }
        if (forbidden) {
          setErrorMessage(LISTING_FORBIDDEN_MESSAGE);
          return;
        }
      } else {
        const { error: insertError } = await client.from("trainings").insert({
          ...payload,
          added_by: user.id
        });

        if (insertError) {
          console.error("Trainings insert hatasi:", insertError.message, insertError.details);
          setErrorMessage("Kayit sirasinda bir sorun olustu. Lutfen tekrar deneyin.");
          return;
        }
      }

      router.push("/ilanlar");
      router.refresh();
    } catch {
      setErrorMessage("Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingRow) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <BackButton />
          <p className="mt-4 text-sm text-slate-600">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <BackButton />
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            {editId ? "Eğitim İlanı Düzenle" : "Egitim Ekle"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Egitim bilgilerini girerek yeni bir egitim kaydi olustur.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Egitim Basligi *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4"
                placeholder="Ornek: React ile Web Gelistirme"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Link *</span>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4"
                placeholder="https://..."
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Ucret Tipi *</span>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4"
              >
                <option value="free">Ucretsiz</option>
                <option value="paid">Ucretli</option>
              </select>
            </label>

            {priceType === "paid" ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Fiyat (TL) *</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4"
                  placeholder="Ornek: 199"
                  required
                />
              </label>
            ) : null}

            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Kaydediliyor..."
                : editId
                  ? "Güncelle ve İlanlara Dön"
                  : "Kaydet ve Dashboard'a Don"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function EgitimEklePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-6 py-10">
          <div className="mx-auto max-w-2xl">
            <p className="text-sm text-slate-600">Yükleniyor...</p>
          </div>
        </main>
      }
    >
      <EgitimEkleForm />
    </Suspense>
  );
}
