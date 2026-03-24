"use client";

import BackButton from "@/components/back-button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type ProfileRow = {
  first_name: string;
  last_name: string;
  phone: string | null;
  city: string;
  district: string;
  university: string;
  department: string;
  linkedin_link: string | null;
  github_link: string | null;
  credly_link: string | null;
};

type QrFieldKey =
  | "fullName"
  | "phone"
  | "email"
  | "address"
  | "linkedin"
  | "github"
  | "credly"
  | "university"
  | "department";

const QR_FIELD_LABELS: Record<QrFieldKey, string> = {
  fullName: "Ad ve soyad",
  phone: "Telefon",
  email: "E-posta",
  address: "Adres (il / ilçe)",
  linkedin: "LinkedIn",
  github: "GitHub",
  credly: "Credly",
  university: "Üniversite",
  department: "Bölüm"
};

const defaultQrFields: Record<QrFieldKey, boolean> = {
  fullName: true,
  phone: true,
  email: true,
  address: true,
  linkedin: true,
  github: false,
  credly: false,
  university: true,
  department: true
};

export default function KartvizitPage() {
  const router = useRouter();
  const qrBoxRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [qrMode, setQrMode] = useState<"vcard" | "profile">("vcard");
  const [baseUrl, setBaseUrl] = useState("");
  const [qrFields, setQrFields] = useState<Record<QrFieldKey, boolean>>(defaultQrFields);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrPayload, setQrPayload] = useState<string>("");
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const { client, error } = getSupabaseClient();
        if (error || !client) {
          if (isMounted) setErrorMessage("Profil yüklenemedi.");
          return;
        }

        const {
          data: { user }
        } = await client.auth.getUser();

        if (!user) {
          if (isMounted) setErrorMessage("Kartvizit için giriş yapmanız gerekiyor.");
          return;
        }
        if (isMounted) setUserEmail(user.email ?? "");

        const { data, error: profileError } = await client
          .from("profiles")
          .select(
            "first_name, last_name, phone, city, district, university, department, linkedin_link, github_link, credly_link"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || !data) {
          if (isMounted) setErrorMessage("Profil bulunamadı. Önce profilinizi tamamlayın.");
          return;
        }

        if (isMounted) setProfile(data as ProfileRow);
      } catch {
        if (isMounted) setErrorMessage("Bir sorun oluştu.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const profileLink = useMemo(
    () => (baseUrl ? `${baseUrl}/profil` : "/profil"),
    [baseUrl]
  );

  function toggleField(key: QrFieldKey) {
    setQrFields((prev) => ({ ...prev, [key]: !prev[key] }));
    setQrGenerated(false);
  }

  function handleGenerateQr() {
    if (!profile) return;
    setQrError(null);

    if (qrMode === "profile") {
      setQrPayload(profileLink);
      setQrGenerated(true);
      return;
    }

    if (!qrFields.fullName) {
      setQrError("vCard için en azından 'Ad ve soyad' seçili olmalıdır.");
      return;
    }

    const vcard = createVCard({
      profile,
      email: userEmail,
      profileLink,
      fields: qrFields
    });
    setQrPayload(vcard);
    setQrGenerated(true);
  }

  function handleDownloadQr() {
    const svg = qrBoxRef.current?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kartvizit-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClose() {
    setQrGenerated(false);
    setQrPayload("");
    setQrError(null);
    setQrFields(defaultQrFields);
    router.push("/");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <p className="text-sm text-slate-600">Yükleniyor...</p>
      </main>
    );
  }

  if (errorMessage || !profile) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-6 py-10">
        <BackButton />
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          {errorMessage ?? "Profil yok."}
        </div>
        <Link
          href="/profil-tamamlama"
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Profili tamamla →
        </Link>
      </main>
    );
  }

  const displayName =
    qrFields.fullName ? `${profile.first_name} ${profile.last_name}`.trim() : "";
  const displayDept = qrFields.department ? profile.department : "";
  const displayUni = qrFields.university ? profile.university : "";

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_45%,_#f5f3ff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <BackButton />
        <div className="mt-4 rounded-3xl border border-white/40 bg-white/90 p-6 shadow-2xl shadow-indigo-300/40">
          <h1 className="text-xl font-semibold text-slate-900">Dijital Kartvizit</h1>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setQrMode("vcard");
                setQrGenerated(false);
                setQrPayload("");
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                qrMode === "vcard"
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Rehbere Ekle (vCard)
            </button>
            <button
              type="button"
              onClick={() => {
                setQrMode("profile");
                setQrGenerated(false);
                setQrPayload("");
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                qrMode === "profile"
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Profil Linki
            </button>
          </div>

          <fieldset className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <legend className="px-1 text-sm font-medium text-slate-800">
              QR içinde yer alacak bilgiler
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              {qrMode === "vcard"
                ? "Seçtikleriniz vCard içeriğine eklenir."
                : "Profil linki modunda QR yalnızca profil URL’sini içerir; kutular vCard için geçerlidir."}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(Object.keys(QR_FIELD_LABELS) as QrFieldKey[]).map((key) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    qrMode === "profile"
                      ? "border-slate-200 bg-slate-100 text-slate-500"
                      : "border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={qrFields[key]}
                    disabled={qrMode === "profile"}
                    onChange={() => toggleField(key)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {QR_FIELD_LABELS[key]}
                </label>
              ))}
            </div>
          </fieldset>

          {qrError ? <p className="mt-3 text-sm text-rose-600">{qrError}</p> : null}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleGenerateQr}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
            >
              QR Oluştur
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-white/80 to-indigo-100/60 p-5 shadow-lg backdrop-blur">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ön Yüz</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{displayName || "—"}</h2>
              {displayDept ? <p className="mt-1 text-sm text-slate-600">{displayDept}</p> : null}
              {displayUni ? <p className="text-sm text-slate-600">{displayUni}</p> : null}
              <div
                ref={qrBoxRef}
                className="mt-4 flex min-h-[200px] items-center justify-center rounded-2xl bg-white p-4 shadow-inner"
              >
                {qrGenerated && qrPayload ? (
                  <QRCodeSVG value={qrPayload} size={180} className="mx-auto" />
                ) : (
                  <p className="text-center text-sm text-slate-500">
                    Alanları seçip &quot;QR Oluştur&quot; ile kodu üretin.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-violet-600/90 to-indigo-700/90 p-5 text-white shadow-lg backdrop-blur">
              <p className="text-xs uppercase tracking-[0.16em] text-indigo-100">Arka Yüz</p>
              <div className="mt-4 space-y-2 text-sm">
                {qrFields.phone ? (
                  <p>
                    <span className="text-indigo-200">Telefon:</span> {profile.phone || "-"}
                  </p>
                ) : null}
                {qrFields.email ? (
                  <p>
                    <span className="text-indigo-200">E-posta:</span> {userEmail || "-"}
                  </p>
                ) : null}
                {qrFields.address ? (
                  <p>
                    <span className="text-indigo-200">Adres:</span> {profile.city} /{" "}
                    {profile.district}
                  </p>
                ) : null}
                {qrFields.linkedin ? (
                  <p>
                    <span className="text-indigo-200">LinkedIn:</span>{" "}
                    {profile.linkedin_link || "Eklenmedi"}
                  </p>
                ) : null}
                {qrFields.github ? (
                  <p>
                    <span className="text-indigo-200">GitHub:</span>{" "}
                    {profile.github_link || "Eklenmedi"}
                  </p>
                ) : null}
                {qrFields.credly ? (
                  <p>
                    <span className="text-indigo-200">Credly:</span>{" "}
                    {profile.credly_link || "Eklenmedi"}
                  </p>
                ) : null}
                {!qrFields.phone &&
                !qrFields.email &&
                !qrFields.address &&
                !qrFields.linkedin &&
                !qrFields.github &&
                !qrFields.credly ? (
                  <p className="text-indigo-100/90">Arka yüz için bilgi seçilmedi.</p>
                ) : null}
              </div>
              <p className="mt-6 text-xs text-indigo-100/90">
                {qrMode === "vcard"
                  ? "Bu QR kodu okuttugunuzda iletisim bilgileri rehbere eklenebilir."
                  : "Bu QR kodu okuttugunuzda dijital profil linki acilir."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={!qrGenerated}
              onClick={handleDownloadQr}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              İndir
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function createVCard({
  profile,
  email,
  profileLink,
  fields
}: {
  profile: ProfileRow;
  email: string;
  profileLink: string;
  fields: Record<QrFieldKey, boolean>;
}) {
  const firstName = profile.first_name;
  const lastName = profile.last_name;
  const fullName = `${firstName} ${lastName}`.trim();
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

  if (fields.fullName) {
    lines.push(`FN:${fullName}`, `N:${lastName};${firstName};;;`);
  }
  if (fields.phone && profile.phone) {
    lines.push(`TEL;TYPE=CELL:${profile.phone}`);
  }
  if (fields.email && email) {
    lines.push(`EMAIL:${email}`);
  }
  if (fields.address) {
    const addr = `${profile.city} / ${profile.district}`.trim();
    if (addr && addr !== "/") {
      lines.push(`ADR;TYPE=HOME:;;${addr};;;;`);
    }
  }
  if (fields.linkedin && profile.linkedin_link) {
    lines.push(`URL:${profile.linkedin_link}`);
  }
  if (fields.github && profile.github_link) {
    lines.push(`URL:${profile.github_link}`);
  }
  if (fields.credly && profile.credly_link) {
    lines.push(`URL:${profile.credly_link}`);
  }
  if (profileLink) {
    lines.push(`URL:${profileLink}`);
  }
  lines.push("END:VCARD");
  return lines.join("\n");
}
