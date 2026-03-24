"use client";

import BackButton from "@/components/back-button";
import { parseCertificatesField } from "@/lib/profile/certificates-field";
import { isCertificatePdfUrl, isProfilePhotoImageUrl } from "@/lib/supabase/profile-media";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type ProfileRow = {
  first_name: string;
  last_name: string;
  gender: string;
  phone: string | null;
  city: string;
  district: string;
  profile_photo: string | null;
  student_status: string;
  university: string;
  department: string;
  class_level: string;
  cap_yandal_department: string | null;
  enrollment_year: number | null;
  grade: number | null;
  experiences: string | null;
  projects: string | null;
  activities: string | null;
  certificates: string | null;
  skills: string | null;
  linkedin_link: string | null;
  github_link: string | null;
  credly_link: string | null;
  languages:
    | Array<{
        language: string;
        reading: number;
        writing: number;
        listening: number;
        speaking: number;
      }>
    | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const { client, error } = getSupabaseClient();
        if (error || !client) {
          if (isMounted) setErrorMessage("Profil bilgisi su an yuklenemiyor.");
          return;
        }

        const {
          data: { user }
        } = await client.auth.getUser();

        if (!user) {
          if (isMounted) setNeedsProfile(true);
          return;
        }

        const { data, error: profileError } = await client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          if (isMounted) setErrorMessage("Profil bilgisi yuklenirken bir sorun olustu.");
          return;
        }

        if (!data) {
          if (isMounted) setNeedsProfile(true);
          return;
        }

        if (isMounted) {
          setProfile(data as ProfileRow);
        }
      } catch {
        if (isMounted) setErrorMessage("Profil bilgisi yuklenirken bir sorun olustu.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const certificatesParsed = useMemo(
    () => (profile ? parseCertificatesField(profile.certificates) : null),
    [profile]
  );

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <p className="text-sm text-slate-600">Profil yukleniyor...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
        <BackButton />
        <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          {errorMessage}
        </div>
      </main>
    );
  }

  if (needsProfile || !profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
        <BackButton />
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-slate-900">Profil bulunamadi</h1>
          <p className="mt-3 text-slate-600">Lutfen once profilinizi tamamlayin.</p>
          <Link
            href="/profil-tamamlama"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Profili Tamamla
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_45%,_#f5f3ff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <BackButton />
        <div className="mt-4 grid gap-6 lg:grid-cols-[330px_1fr]">
          <aside className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-indigo-100 backdrop-blur">
            <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-600">
              {isProfilePhotoImageUrl(profile.profile_photo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profile_photo!.trim()}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {profile.first_name.slice(0, 1) + profile.last_name.slice(0, 1)}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="mt-1 text-center text-sm text-slate-500">
              {profile.department} - {profile.university}
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <Info label="Cinsiyet" value={profile.gender} />
              <Info label="Telefon" value={profile.phone ?? "-"} />
              <Info label="Konum" value={`${profile.city} / ${profile.district}`} />
              <Info label="Durum" value={profile.student_status} />
              <Info label="Sinif" value={profile.class_level} />
              <Info label="Ortalama" value={profile.grade ? String(profile.grade) : "-"} />
            </div>

            <div className="mt-6 space-y-2">
              <SocialLink href={profile.linkedin_link} label="LinkedIn" />
              <SocialLink href={profile.github_link} label="GitHub" />
              <SocialLink href={profile.credly_link} label="Credly" />
            </div>
            <Link
              href="/profil-tamamlama"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-200 transition hover:brightness-110"
            >
              Duzenle
            </Link>
          </aside>

          <section className="space-y-6">
            <Card title="Deneyim ve Projeler">
              <Detail label="Deneyimler" value={profile.experiences} />
              <Detail label="Projeler" value={profile.projects} />
              <Detail label="Etkinlikler" value={profile.activities} />
              {certificatesParsed?.notes?.trim() ? (
                <Detail label="Sertifikalar (metin)" value={certificatesParsed.notes} />
              ) : null}
              {certificatesParsed && certificatesParsed.images.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Sertifika dosyalari
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {certificatesParsed.images.map((url) =>
                      isCertificatePdfUrl(url) ? (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:bg-slate-100"
                        >
                          <FileText className="h-10 w-10 text-rose-600" strokeWidth={1.5} />
                          <span className="text-xs font-medium text-slate-800">PDF</span>
                          <span className="text-[10px] text-slate-500">Ac</span>
                        </a>
                      ) : (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Sertifika"
                            className="aspect-[4/3] w-full object-cover transition hover:opacity-90"
                          />
                        </a>
                      )
                    )}
                  </div>
                </div>
              ) : null}
              {!certificatesParsed?.notes?.trim() &&
              (!certificatesParsed || certificatesParsed.images.length === 0) ? (
                <Detail label="Sertifikalar" value={profile.certificates} />
              ) : null}
            </Card>

            <Card title="Egitim Bilgileri">
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Universite" value={profile.university} />
                <Detail label="Bolum" value={profile.department} />
                <Detail
                  label="Giris Yili"
                  value={profile.enrollment_year ? String(profile.enrollment_year) : "-"}
                />
                <Detail label="CAP/Yandal" value={profile.cap_yandal_department} />
              </div>
            </Card>

            <Card title="Diller ve Beceriler">
              <Detail label="Beceriler" value={profile.skills} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(profile.languages ?? []).length > 0 ? (
                  (profile.languages ?? []).map((lang, idx) => (
                    <div
                      key={`${lang.language}-${idx}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="font-medium text-slate-900">{lang.language}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        Okuma: {lang.reading} | Yazma: {lang.writing} | Dinleme:{" "}
                        {lang.listening} | Konusma: {lang.speaking}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Dil bilgisi eklenmemis.</p>
                )}
              </div>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-indigo-100 backdrop-blur">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value && value.trim() ? value : "-"}</p>
    </div>
  );
}

function SocialLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        {label}: Eklenmedi
      </p>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
    >
      {label} Profili
    </a>
  );
}
