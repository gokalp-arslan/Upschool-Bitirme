"use client";

import BackButton from "@/components/back-button";
import { parseCertificatesField, serializeCertificatesField } from "@/lib/profile/certificates-field";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  isCertificatePdfUrl,
  isProfilePhotoImageUrl,
  uploadProfileImage
} from "@/lib/supabase/profile-media";
import { FileText, ImagePlus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type LanguageEntry = {
  id: number;
  dil: string;
  okuma: number;
  yazma: number;
  dinleme: number;
  konusma: number;
};

type FormState = {
  ad: string;
  soyad: string;
  cinsiyet: string;
  iletisimNo: string;
  ikametIl: string;
  ikametIlce: string;
  profilFotografiAdi: string;
  ogrenciDurumu: string;
  universite: string;
  bolum: string;
  sinif: string;
  capYandalBolumAdi: string;
  girisYili: string;
  notOrtalamasi: string;
  deneyimler: string;
  projeler: string;
  etkinlikler: string;
  sertifikalarNot: string;
  sertifikaImageUrls: string[];
  beceriler: string;
  linkedin: string;
  github: string;
  credly: string;
  diller: LanguageEntry[];
};

type ProfileUpsertPayload = {
  id: string;
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
  languages: Array<{
    language: string;
    reading: number;
    writing: number;
    listening: number;
    speaking: number;
  }>;
  updated_at: string;
};

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

const steps = [
  "Kisisel Bilgiler",
  "Egitim",
  "Deneyim ve Projeler",
  "Yetenek ve Sosyal"
];

const cityDistricts: Record<string, string[]> = {
  Istanbul: ["Kadikoy", "Besiktas"],
  Ankara: ["Cankaya", "Kecioren"],
  Izmir: ["Karsiyaka", "Bornova"]
};

const sinifSecenekleri = [
  "Hazirlik",
  "1. Sinif",
  "2. Sinif",
  "3. Sinif",
  "4. Sinif",
  "5. Sinif",
  "6. Sinif"
];

const dilSecenekleri = ["Turkce", "Ingilizce", "Almanca", "Fransizca", "Ispanyolca"];

const initialState: FormState = {
  ad: "",
  soyad: "",
  cinsiyet: "",
  iletisimNo: "",
  ikametIl: "",
  ikametIlce: "",
  profilFotografiAdi: "",
  ogrenciDurumu: "",
  universite: "",
  bolum: "",
  sinif: "",
  capYandalBolumAdi: "",
  girisYili: "",
  notOrtalamasi: "",
  deneyimler: "",
  projeler: "",
  etkinlikler: "",
  sertifikalarNot: "",
  sertifikaImageUrls: [],
  beceriler: "",
  linkedin: "",
  github: "",
  credly: "",
  diller: []
};

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCerts, setUploadingCerts] = useState(false);

  const progressPercent = useMemo(() => (step / steps.length) * 100, [step]);
  const isLastStep = step === steps.length;
  const ilceSecenekleri = form.ikametIl ? cityDistricts[form.ikametIl] : [];

  useEffect(() => {
    let isMounted = true;

    async function loadExistingProfile() {
      try {
        const { client } = getSupabaseClient();
        if (!client) return;

        const {
          data: { user }
        } = await client.auth.getUser();

        if (!user) return;
        if (isMounted) setAuthUserId(user.id);

        const { data, error } = await client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error || !data || !isMounted) return;
        setForm(mapProfileToForm(data as ProfileRow));
      } catch {
        // Keep empty form if profile prefill fails.
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    }

    void loadExistingProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAvatarFile(file: File | null) {
    if (!file) return;
    const { client } = getSupabaseClient();
    if (!client || !authUserId) {
      setErrorMessage("Oturum veya baglanti bulunamadi. Sayfayi yenileyin.");
      return;
    }
    setUploadingPhoto(true);
    setErrorMessage(null);
    const result = await uploadProfileImage(client, authUserId, file, "avatar");
    setUploadingPhoto(false);
    if ("error" in result) {
      setErrorMessage(result.error);
      return;
    }
    updateField("profilFotografiAdi", result.publicUrl);
  }

  async function handleCertificateFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const { client } = getSupabaseClient();
    if (!client || !authUserId) {
      setErrorMessage("Oturum veya baglanti bulunamadi. Sayfayi yenileyin.");
      return;
    }
    setUploadingCerts(true);
    setErrorMessage(null);
    const nextUrls: string[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const result = await uploadProfileImage(client, authUserId, file, "certificate");
      if ("error" in result) {
        setErrorMessage(result.error);
        setUploadingCerts(false);
        return;
      }
      nextUrls.push(result.publicUrl);
    }
    setForm((prev) => ({
      ...prev,
      sertifikaImageUrls: [...prev.sertifikaImageUrls, ...nextUrls]
    }));
    setUploadingCerts(false);
  }

  function removeCertificateImage(url: string) {
    setForm((prev) => ({
      ...prev,
      sertifikaImageUrls: prev.sertifikaImageUrls.filter((u) => u !== url)
    }));
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addLanguage() {
    setForm((prev) => ({
      ...prev,
      diller: [
        ...prev.diller,
        {
          id: Date.now(),
          dil: "",
          okuma: 3,
          yazma: 3,
          dinleme: 3,
          konusma: 3
        }
      ]
    }));
  }

  function removeLanguage(id: number) {
    setForm((prev) => ({
      ...prev,
      diller: prev.diller.filter((item) => item.id !== id)
    }));
  }

  function updateLanguage(id: number, field: keyof LanguageEntry, value: string | number) {
    setForm((prev) => ({
      ...prev,
      diller: prev.diller.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  }

  function validateCurrentStep() {
    if (
      step === 1 &&
      (!form.ad || !form.soyad || !form.cinsiyet || !form.ikametIl || !form.ikametIlce)
    ) {
      return "Lutfen ad, soyad, cinsiyet ve ikamet alanlarini doldur.";
    }

    if (
      step === 2 &&
      (!form.ogrenciDurumu || !form.universite || !form.bolum || !form.sinif)
    ) {
      return "Lutfen egitim adimindaki zorunlu alanlari tamamla.";
    }

    if (step === 3 && !form.deneyimler && !form.projeler) {
      return "En azindan deneyim veya proje alanlarindan birini doldur.";
    }

    if (step === 4 && form.diller.some((item) => !item.dil)) {
      return "Eklenen dil kartlarinda dil secimi bos birakilamaz.";
    }

    return null;
  }

  function goNext() {
    setSuccessMessage(null);
    const validationError = validateCurrentStep();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setStep((prev) => Math.min(prev + 1, steps.length));
  }

  function goBack() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function finishForm() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const { client, error: clientError } = getSupabaseClient();

      if (clientError || !client) {
        setErrorMessage("Kaydedilirken bir sorun olustu, lutfen tekrar deneyin");
        return;
      }

      const {
        data: { user },
        error: userError
      } = await client.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Kaydedilirken bir sorun olustu, lutfen tekrar deneyin");
        return;
      }
      if (!user.id) {
        setErrorMessage("Kaydedilirken bir sorun olustu, lutfen tekrar deneyin");
        return;
      }

      const { error: upsertError } = await client.from("profiles").upsert(
        buildProfilePayload(user.id, form),
        { onConflict: "id" }
      );

      if (upsertError) {
        console.error(
          "Supabase Hatası Detayı:",
          upsertError.message,
          upsertError.details,
          upsertError.hint
        );
        setErrorMessage("Kaydedilirken bir sorun olustu, lutfen tekrar deneyin");
        return;
      }

      router.push("/?profil=basarili");
    } catch (error) {
      console.error("Supabase Hatasi Detayi:", error);
      setErrorMessage("Kaydedilirken bir sorun olustu, lutfen tekrar deneyin");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0e7ff_0%,_#f8fafc_35%,_#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <BackButton />
        <div className="mt-4 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-2xl shadow-indigo-200/40 backdrop-blur md:p-8">
          {isLoadingProfile ? (
            <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              Mevcut profil bilgileriniz yukleniyor...
            </div>
          ) : null}
          <div className="mb-7">
            <p className="text-sm font-medium text-indigo-600">
              Adim {step} / {steps.length}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Profilini Tamamla
            </h1>
            <p className="mt-2 text-sm text-slate-600">{steps[step - 1]}</p>
            <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {step === 1 ? (
              <>
                <FormField label="Ad">
                  <input
                    value={form.ad}
                    onChange={(e) => updateField("ad", e.target.value)}
                    className={inputClass}
                    placeholder="Ornek: Ahmet"
                  />
                </FormField>
                <FormField label="Soyad">
                  <input
                    value={form.soyad}
                    onChange={(e) => updateField("soyad", e.target.value)}
                    className={inputClass}
                    placeholder="Ornek: Kaya"
                  />
                </FormField>
                <FormField label="Cinsiyet">
                  <select
                    value={form.cinsiyet}
                    onChange={(e) => updateField("cinsiyet", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seciniz</option>
                    <option value="kadin">Kadin</option>
                    <option value="erkek">Erkek</option>
                    <option value="belirtmek-istemiyorum">Belirtmek istemiyorum</option>
                  </select>
                </FormField>
                <FormField label="Iletisim Numarasi">
                  <input
                    value={form.iletisimNo}
                    onChange={(e) => updateField("iletisimNo", e.target.value)}
                    className={inputClass}
                    placeholder="+90 5xx xxx xx xx"
                  />
                </FormField>
                <FormField label="Ikamet Il">
                  <select
                    value={form.ikametIl}
                    onChange={(e) => {
                      updateField("ikametIl", e.target.value);
                      updateField("ikametIlce", "");
                    }}
                    className={inputClass}
                  >
                    <option value="">Seciniz</option>
                    <option value="Istanbul">Istanbul</option>
                    <option value="Ankara">Ankara</option>
                    <option value="Izmir">Izmir</option>
                  </select>
                </FormField>
                <FormField label="Ikamet Ilce">
                  <select
                    value={form.ikametIlce}
                    onChange={(e) => updateField("ikametIlce", e.target.value)}
                    className={inputClass}
                    disabled={!form.ikametIl}
                  >
                    <option value="">Seciniz</option>
                    {ilceSecenekleri.map((ilce) => (
                      <option key={ilce} value={ilce}>
                        {ilce}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Profil Fotografisi (Opsiyonel)">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-600">
                      {isProfilePhotoImageUrl(form.profilFotografiAdi) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.profilFotografiAdi.trim()}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>
                          {form.ad.trim() && form.soyad.trim()
                            ? (form.ad.trim()[0] + form.soyad.trim()[0]).toUpperCase()
                            : "?"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingPhoto || !authUserId}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          void handleAvatarFile(f ?? null);
                          e.target.value = "";
                        }}
                        className="w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500 disabled:opacity-50"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {uploadingPhoto ? (
                          <span className="text-xs text-indigo-600">Yukleniyor...</span>
                        ) : null}
                        {form.profilFotografiAdi ? (
                          <button
                            type="button"
                            onClick={() => updateField("profilFotografiAdi", "")}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <X className="h-3.5 w-3.5" />
                            Kaldir
                          </button>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">
                        PNG, JPG veya WebP. Yukleme sonrasi onizleme gorunur. Max 5 MB.
                      </p>
                    </div>
                  </div>
                </FormField>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <FormField label="Ogrenci / Mezun Durumu">
                  <select
                    value={form.ogrenciDurumu}
                    onChange={(e) => updateField("ogrenciDurumu", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seciniz</option>
                    <option value="ogrenci">Ogrenci</option>
                    <option value="mezun">Mezun</option>
                  </select>
                </FormField>
                <FormField label="Universite">
                  <input
                    value={form.universite}
                    onChange={(e) => updateField("universite", e.target.value)}
                    className={inputClass}
                    placeholder="Universite adi"
                  />
                </FormField>
                <FormField label="Bolum">
                  <input
                    value={form.bolum}
                    onChange={(e) => updateField("bolum", e.target.value)}
                    className={inputClass}
                    placeholder="Bolum adi"
                  />
                </FormField>
                <FormField label="Sinif">
                  <select
                    value={form.sinif}
                    onChange={(e) => updateField("sinif", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seciniz</option>
                    {sinifSecenekleri.map((sinif) => (
                      <option key={sinif} value={sinif}>
                        {sinif}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="CAP veya Yandal yapiyor musunuz? Varsa Bolumunuzu Belirtin:">
                  <input
                    value={form.capYandalBolumAdi}
                    onChange={(e) => updateField("capYandalBolumAdi", e.target.value)}
                    className={inputClass}
                    placeholder="Bolum Adi"
                  />
                </FormField>
                <FormField label="Giris Yili">
                  <input
                    value={form.girisYili}
                    onChange={(e) => updateField("girisYili", e.target.value)}
                    className={inputClass}
                    placeholder="Ornek: 2022"
                  />
                </FormField>
                <FormField label="Not Ortalamasi">
                  <input
                    value={form.notOrtalamasi}
                    onChange={(e) => updateField("notOrtalamasi", e.target.value)}
                    className={inputClass}
                    placeholder="Ornek: 3.45"
                  />
                </FormField>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <FormField label="Is / Staj Deneyimleri">
                  <textarea
                    value={form.deneyimler}
                    onChange={(e) => updateField("deneyimler", e.target.value)}
                    className={textareaClass}
                    placeholder="Deneyimlerini kisa maddeler halinde yazabilirsin."
                  />
                </FormField>
                <FormField label="Projeler">
                  <textarea
                    value={form.projeler}
                    onChange={(e) => updateField("projeler", e.target.value)}
                    className={textareaClass}
                    placeholder="One cikarmak istedigin projeleri yaz."
                  />
                </FormField>
                <FormField label="Etkinlikler">
                  <textarea
                    value={form.etkinlikler}
                    onChange={(e) => updateField("etkinlikler", e.target.value)}
                    className={textareaClass}
                    placeholder="Katildigin etkinlikler, kulup calismalari vb."
                  />
                </FormField>
                <FormField label="Sertifikalar (metin, gorsel veya PDF)">
                  <textarea
                    value={form.sertifikalarNot}
                    onChange={(e) => updateField("sertifikalarNot", e.target.value)}
                    className={textareaClass}
                    placeholder="Sertifika adlari, kurum, tarih vb. (istege bagli)"
                  />
                  <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
                        <ImagePlus className="h-4 w-4" />
                        <span>{uploadingCerts ? "Yukleniyor..." : "Dosya ekle"}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf,.pdf"
                          multiple
                          disabled={uploadingCerts || !authUserId}
                          className="hidden"
                          onChange={(e) => {
                            void handleCertificateFiles(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <p className="text-xs text-slate-500">
                        Gorsel (PNG, JPG, WebP, GIF) veya PDF; birden fazla dosya (max 5 MB / dosya).
                      </p>
                    </div>
                    {form.sertifikaImageUrls.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {form.sertifikaImageUrls.map((url) => (
                          <div
                            key={url}
                            className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                          >
                            {isCertificatePdfUrl(url) ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-slate-50 p-3 text-center hover:bg-slate-100"
                              >
                                <FileText className="h-10 w-10 text-rose-600" strokeWidth={1.5} />
                                <span className="text-xs font-medium text-slate-700">PDF</span>
                                <span className="line-clamp-2 break-all text-[10px] text-slate-500">
                                  Ac / indir
                                </span>
                              </a>
                            ) : (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt="Sertifika"
                                  className="aspect-[4/3] w-full object-cover"
                                />
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => removeCertificateImage(url)}
                              className="absolute right-1 top-1 rounded-md bg-rose-600 p-1 text-white shadow hover:bg-rose-500"
                              aria-label="Kaldir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </FormField>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800">Diller</p>
                    <button
                      type="button"
                      onClick={addLanguage}
                      className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                      + Dil Ekle
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Her dil icin okuma, yazma, dinleme ve konusma seviyelerini 1-5 arasi puanla.
                  </p>
                  <div className="mt-4 space-y-3">
                    {form.diller.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                        Henuz dil eklenmedi.
                      </p>
                    ) : null}
                    {form.diller.map((dil) => (
                      <div
                        key={dil.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <select
                            value={dil.dil}
                            onChange={(e) => updateLanguage(dil.id, "dil", e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4"
                          >
                            <option value="">Dil seciniz</option>
                            {dilSecenekleri.map((dilSecenegi) => (
                              <option key={dilSecenegi} value={dilSecenegi}>
                                {dilSecenegi}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeLanguage(dil.id)}
                            className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                          >
                            Sil
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <LanguageRating
                            label="Okuma"
                            value={dil.okuma}
                            onChange={(value) => updateLanguage(dil.id, "okuma", value)}
                          />
                          <LanguageRating
                            label="Yazma"
                            value={dil.yazma}
                            onChange={(value) => updateLanguage(dil.id, "yazma", value)}
                          />
                          <LanguageRating
                            label="Dinleme"
                            value={dil.dinleme}
                            onChange={(value) => updateLanguage(dil.id, "dinleme", value)}
                          />
                          <LanguageRating
                            label="Konusma"
                            value={dil.konusma}
                            onChange={(value) => updateLanguage(dil.id, "konusma", value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <FormField label="Beceriler">
                  <input
                    value={form.beceriler}
                    onChange={(e) => updateField("beceriler", e.target.value)}
                    className={inputClass}
                    placeholder="Ornek: React, Python, SQL, Problem Solving"
                  />
                </FormField>
                <FormField label="LinkedIn Linki">
                  <input
                    value={form.linkedin}
                    onChange={(e) => updateField("linkedin", e.target.value)}
                    className={inputClass}
                    placeholder="https://linkedin.com/in/..."
                  />
                  <p className="text-xs text-slate-500">Opsiyonel</p>
                </FormField>
                <FormField label="GitHub Linki">
                  <input
                    value={form.github}
                    onChange={(e) => updateField("github", e.target.value)}
                    className={inputClass}
                    placeholder="https://github.com/..."
                  />
                  <p className="text-xs text-slate-500">Opsiyonel</p>
                </FormField>
                <FormField label="Credly Linki">
                  <input
                    value={form.credly}
                    onChange={(e) => updateField("credly", e.target.value)}
                    className={inputClass}
                    placeholder="https://www.credly.com/users/..."
                  />
                  <p className="text-xs text-slate-500">Opsiyonel</p>
                </FormField>
              </>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Geri
            </button>

            {!isLastStep ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-300/50 transition hover:brightness-110"
              >
                Ileri
              </button>
            ) : (
              <button
                type="button"
                onClick={finishForm}
                disabled={isSaving}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-300/50 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Kaydediliyor..." : "Kaydet ve Bitir"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function FormField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function LanguageRating({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`rounded-lg border px-2 py-1 text-sm transition ${
              value === score
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Okuma, yazma, dinleme ve konusma genel seviyen icin puan sec.
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4";

const textareaClass =
  "min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4";

function mapProfileToForm(profile: ProfileRow): FormState {
  return {
    ad: profile.first_name ?? "",
    soyad: profile.last_name ?? "",
    cinsiyet: profile.gender ?? "",
    iletisimNo: profile.phone ?? "",
    ikametIl: profile.city ?? "",
    ikametIlce: profile.district ?? "",
    profilFotografiAdi: profile.profile_photo ?? "",
    ogrenciDurumu: profile.student_status ?? "",
    universite: profile.university ?? "",
    bolum: profile.department ?? "",
    sinif: profile.class_level ?? "",
    capYandalBolumAdi: profile.cap_yandal_department ?? "",
    girisYili: profile.enrollment_year ? String(profile.enrollment_year) : "",
    notOrtalamasi: profile.grade ? String(profile.grade) : "",
    deneyimler: profile.experiences ?? "",
    projeler: profile.projects ?? "",
    etkinlikler: profile.activities ?? "",
    ...(() => {
      const c = parseCertificatesField(profile.certificates);
      return {
        sertifikalarNot: c.notes,
        sertifikaImageUrls: c.images
      };
    })(),
    beceriler: profile.skills ?? "",
    linkedin: profile.linkedin_link ?? "",
    github: profile.github_link ?? "",
    credly: profile.credly_link ?? "",
    diller: (profile.languages ?? []).map((item, index) => ({
      id: Date.now() + index,
      dil: item.language ?? "",
      okuma: item.reading ?? 3,
      yazma: item.writing ?? 3,
      dinleme: item.listening ?? 3,
      konusma: item.speaking ?? 3
    }))
  };
}

function buildProfilePayload(userId: string, form: FormState): ProfileUpsertPayload {
  return {
    id: userId,
    first_name: form.ad.trim(),
    last_name: form.soyad.trim(),
    gender: form.cinsiyet,
    phone: toNullableText(form.iletisimNo),
    city: form.ikametIl,
    district: form.ikametIlce,
    profile_photo: toNullableText(form.profilFotografiAdi),
    student_status: form.ogrenciDurumu,
    university: form.universite.trim(),
    department: form.bolum.trim(),
    class_level: form.sinif,
    cap_yandal_department: toNullableText(form.capYandalBolumAdi),
    enrollment_year: toNullableNumber(form.girisYili),
    grade: toNullableNumber(form.notOrtalamasi),
    experiences: toNullableText(form.deneyimler),
    projects: toNullableText(form.projeler),
    activities: toNullableText(form.etkinlikler),
    certificates: serializeCertificatesField(form.sertifikalarNot, form.sertifikaImageUrls),
    skills: toNullableText(form.beceriler),
    linkedin_link: toNullableText(form.linkedin),
    github_link: toNullableText(form.github),
    credly_link: toNullableText(form.credly),
    // jsonb alanina temiz ve tipli dizi gonderiyoruz.
    languages: form.diller.map((item) => ({
      language: item.dil,
      reading: item.okuma,
      writing: item.yazma,
      listening: item.dinleme,
      speaking: item.konusma
    })),
    updated_at: new Date().toISOString()
  };
}
