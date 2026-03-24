"use client";

import BackButton from "@/components/back-button";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  deleteListingAsOwner,
  LISTING_FORBIDDEN_MESSAGE
} from "@/lib/supabase/listing-owner-mutations";
import { Briefcase, GraduationCap, ExternalLink, MoreVertical } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Internship = {
  id: string;
  company_name: string;
  title: string;
  location: string;
  link: string;
  added_by: string | null;
};

type Training = {
  id: string;
  title: string;
  link: string;
  price_type: string;
  price_value: number | null;
  added_by: string | null;
};

function formatPrice(t: Training) {
  if (t.price_type === "free") return "Ücretsiz";
  const val = t.price_value;
  return val != null ? `${val} TL` : "Ücretli";
}

export default function IlanlarPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [stajAppliedIds, setStajAppliedIds] = useState<Set<string>>(new Set());
  const [egitimAppliedIds, setEgitimAppliedIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "staj" | "egitim"; id: string } | null
  >(null);

  const loadData = useCallback(async () => {
    const { client } = getSupabaseClient();
    if (!client) {
      setErrorMessage("Bağlantı hatası.");
      setLoading(false);
      return;
    }

    const {
      data: { user }
    } = await client.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const intRes = await client
      .from("internships")
      .select("id, company_name, title, location, link, added_by")
      .order("created_at", { ascending: false });

    const trRes = await client
      .from("trainings")
      .select("id, title, link, price_type, price_value, added_by")
      .order("created_at", { ascending: false });

    if (intRes.error) {
      setErrorMessage("Staj ilanları yüklenemedi.");
      setLoading(false);
      return;
    }
    if (trRes.error) {
      setErrorMessage("Eğitimler yüklenemedi.");
      setLoading(false);
      return;
    }

    setInternships((intRes.data ?? []) as Internship[]);
    setTrainings((trRes.data ?? []) as Training[]);

    if (user) {
      const [stajApp, egitimApp] = await Promise.all([
        client
          .from("internship_applications")
          .select("internship_id")
          .eq("user_id", user.id),
        client
          .from("training_applications")
          .select("training_id")
          .eq("user_id", user.id)
      ]);
      setStajAppliedIds(
        new Set((stajApp.data ?? []).map((r: { internship_id: string }) => r.internship_id))
      );
      setEgitimAppliedIds(
        new Set((egitimApp.data ?? []).map((r: { training_id: string }) => r.training_id))
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(id);
  }, [loadData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-listing-menu-root]")) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleStajApply(internshipId: string) {
    const { client } = getSupabaseClient();
    if (!client) return;

    const {
      data: { user }
    } = await client.auth.getUser();

    if (!user) {
      setErrorMessage("Başvuru için giriş yapmanız gerekiyor.");
      return;
    }

    setApplyingId(internshipId);
    setErrorMessage(null);

    const { error } = await client.from("internship_applications").insert({
      user_id: user.id,
      internship_id: internshipId
    });

    if (error) {
      setErrorMessage("Başvuru sırasında bir sorun oluştu.");
    } else {
      setStajAppliedIds((prev) => new Set(prev).add(internshipId));
    }

    setApplyingId(null);
  }

  async function handleEgitimApply(trainingId: string) {
    const { client } = getSupabaseClient();
    if (!client) return;

    const {
      data: { user }
    } = await client.auth.getUser();

    if (!user) {
      setErrorMessage("Başvuru için giriş yapmanız gerekiyor.");
      return;
    }

    setApplyingId(trainingId);
    setErrorMessage(null);

    const { error } = await client.from("training_applications").insert({
      user_id: user.id,
      training_id: trainingId
    });

    if (error) {
      setErrorMessage("Başvuru sırasında bir sorun oluştu.");
    } else {
      setEgitimAppliedIds((prev) => new Set(prev).add(trainingId));
    }

    setApplyingId(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { client } = getSupabaseClient();
    if (!client) return;

    const {
      data: { user }
    } = await client.auth.getUser();
    if (!user) {
      setErrorMessage("Bu işlem için giriş yapmanız gerekiyor.");
      setDeleteTarget(null);
      return;
    }

    const removedId = deleteTarget.id;
    const removedType = deleteTarget.type;

    if (removedType === "staj") {
      const { error, forbidden } = await deleteListingAsOwner(
        client,
        "internships",
        removedId,
        user.id
      );

      if (error) {
        setErrorMessage("İlan silinemedi.");
      } else if (forbidden) {
        setErrorMessage(LISTING_FORBIDDEN_MESSAGE);
      } else {
        setErrorMessage(null);
        setInternships((prev) => prev.filter((row) => row.id !== removedId));
        setStajAppliedIds((prev) => {
          const next = new Set(prev);
          next.delete(removedId);
          return next;
        });
      }
    } else {
      const { error, forbidden } = await deleteListingAsOwner(
        client,
        "trainings",
        removedId,
        user.id
      );

      if (error) {
        setErrorMessage("İlan silinemedi.");
      } else if (forbidden) {
        setErrorMessage(LISTING_FORBIDDEN_MESSAGE);
      } else {
        setErrorMessage(null);
        setTrainings((prev) => prev.filter((row) => row.id !== removedId));
        setEgitimAppliedIds((prev) => {
          const next = new Set(prev);
          next.delete(removedId);
          return next;
        });
      }
    }

    setDeleteTarget(null);
    setOpenMenu(null);
  }

  function isOwner(row: Internship | Training) {
    if (!currentUserId) return false;
    return row.added_by !== null && row.added_by === currentUserId;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <BackButton />
          <p className="mt-4 text-sm text-slate-600">İlanlar yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_50%)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <BackButton />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">İlanlara Başvur</h1>
          <p className="mt-2 text-slate-600">
            Staj ilanları ve eğitim programlarına tek sayfadan başvurabilirsiniz.
          </p>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Briefcase className="h-5 w-5 text-indigo-600" />
              Staj İlanları
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Açık staj pozisyonlarını inceleyebilir ve başvurabilirsiniz.
            </p>
            {internships.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
                Henüz staj ilanı eklenmemiş.
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {internships.map((i) => {
                  const applied = stajAppliedIds.has(i.id);
                  const applying = applyingId === i.id;
                  const owner = isOwner(i);
                  const menuKey = `staj-${i.id}`;

                  return (
                    <div
                      key={i.id}
                      className="relative z-0 overflow-visible rounded-2xl border border-slate-200/80 bg-white p-6 pt-12 shadow-sm shadow-slate-200/50 transition hover:shadow-md"
                    >
                      {owner ? (
                        <div className="absolute right-3 top-3 z-30" data-listing-menu-root>
                          <button
                            type="button"
                            aria-label="İlan seçenekleri"
                            onClick={() =>
                              setOpenMenu((prev) => (prev === menuKey ? null : menuKey))
                            }
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            <MoreVertical className="h-5 w-5" strokeWidth={2} />
                          </button>
                          {openMenu === menuKey ? (
                            <div className="absolute right-0 z-40 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              <Link
                                href={`/staj-ekle?id=${i.id}`}
                                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => setOpenMenu(null)}
                              >
                                Düzenle
                              </Link>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setDeleteTarget({ type: "staj", id: i.id });
                                  setOpenMenu(null);
                                }}
                              >
                                Sil
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
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
                          onClick={() => handleStajApply(i.id)}
                          disabled={applied || applying}
                          className="inline-flex rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {applying ? "Kaydediliyor..." : applied ? "Başvuruldu" : "Başvurdum"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-12">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              Eğitim Programları
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Eğitimlere başvurabilir veya detay için linke gidebilirsiniz.
            </p>
            {trainings.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
                Henüz eğitim eklenmemiş.
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {trainings.map((t) => {
                  const applied = egitimAppliedIds.has(t.id);
                  const applying = applyingId === t.id;
                  const owner = isOwner(t);
                  const menuKey = `egitim-${t.id}`;

                  return (
                    <div
                      key={t.id}
                      className="relative z-0 overflow-visible rounded-2xl border border-slate-200/80 bg-white p-6 pt-12 shadow-sm shadow-slate-200/50 transition hover:shadow-md"
                    >
                      {owner ? (
                        <div
                          className="absolute right-3 top-3 z-30"
                          data-listing-menu-root
                        >
                          <button
                            type="button"
                            aria-label="İlan seçenekleri"
                            onClick={() =>
                              setOpenMenu((prev) => (prev === menuKey ? null : menuKey))
                            }
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            <MoreVertical className="h-5 w-5" strokeWidth={2} />
                          </button>
                          {openMenu === menuKey ? (
                            <div className="absolute right-0 z-40 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              <Link
                                href={`/egitim-ekle?id=${t.id}`}
                                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => setOpenMenu(null)}
                              >
                                Düzenle
                              </Link>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setDeleteTarget({ type: "egitim", id: t.id });
                                  setOpenMenu(null);
                                }}
                              >
                                Sil
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <h3 className="text-lg font-semibold text-slate-900">{t.title}</h3>
                      <p className="mt-2 text-sm text-slate-600">{formatPrice(t)}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={t.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Eğitimi İncele
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleEgitimApply(t.id)}
                          disabled={applied || applying}
                          className="inline-flex rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {applying ? "Kaydediliyor..." : applied ? "Başvuruldu" : "Başvurdum"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72">
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-sm">
            <p className="font-semibold text-amber-900">Bilgi</p>
            <p className="mt-2 leading-relaxed text-amber-900/90">
              Yalnızca kendi eklediğiniz ilanları düzenleyebilir veya silebilirsiniz. Üç nokta
              menüsü yalnızca ilanı oluşturan kullanıcıya gösterilir.
            </p>
          </div>
        </aside>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">İlanı sil</h3>
            <p className="mt-2 text-sm text-slate-600">
              Bu ilanı kalıcı olarak silmek istediğinize emin misiniz? Başvurular da kaldırılır.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
