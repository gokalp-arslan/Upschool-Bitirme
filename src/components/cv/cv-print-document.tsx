"use client";

import { parseCertificatesField } from "@/lib/profile/certificates-field";
import { forwardRef, useMemo } from "react";

export type CvProfile = {
  first_name: string;
  last_name: string;
  gender: string;
  phone: string | null;
  city: string;
  district: string;
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

type Props = {
  profile: CvProfile;
  email: string | null;
};

function linesToList(text: string | null): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function SectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="border-b border-neutral-900 pb-1 text-xs font-bold uppercase tracking-[0.2em] text-neutral-900 print:pb-0.5"
    >
      {children}
    </h2>
  );
}

export const CvPrintDocument = forwardRef<HTMLDivElement, Props>(function CvPrintDocument(
  { profile, email },
  ref
) {
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const location = [profile.city, profile.district].filter(Boolean).join(" / ");

  const contactParts = [email, profile.phone].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );

  const expLines = linesToList(profile.experiences);
  const projectLines = linesToList(profile.projects);
  const activityLines = linesToList(profile.activities);
  const certLines = useMemo(() => {
    const c = parseCertificatesField(profile.certificates);
    const noteLines = linesToList(c.notes);
    const urlLines = c.images.map((u) => u.trim()).filter(Boolean);
    return [...noteLines, ...urlLines];
  }, [profile.certificates]);
  const skillLines = linesToList(profile.skills);
  const langs = profile.languages ?? [];

  return (
    <div
      ref={ref}
      className="box-border min-h-[297mm] w-full max-w-[210mm] bg-white p-8 text-neutral-900 shadow-sm print:min-h-0 print:w-full print:max-w-none print:p-0 print:shadow-none"
    >
      {/* ATS: tek sütun, anlamsal başlıklar, düz metin ağırlıklı */}
      <article className="font-sans text-[11pt] leading-relaxed text-neutral-900 antialiased print:text-[11pt]">
        <header className="border-b-2 border-neutral-900 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 print:text-[18pt]">
            {fullName}
          </h1>
          <p className="mt-2 text-sm text-neutral-700 print:text-[10pt]">
            {profile.department}
            {profile.university ? ` · ${profile.university}` : ""}
          </p>
          <p className="mt-1 text-sm text-neutral-600 print:text-[10pt]">
            {[contactParts.join(" · "), location].filter(Boolean).join(" · ")}
          </p>
          {(profile.linkedin_link || profile.github_link || profile.credly_link) && (
            <ul className="mt-3 list-none space-y-0.5 text-sm text-neutral-800 print:text-[10pt]">
              {profile.linkedin_link ? (
                <li>
                  LinkedIn:{" "}
                  <span className="break-all">{profile.linkedin_link}</span>
                </li>
              ) : null}
              {profile.github_link ? (
                <li>
                  GitHub: <span className="break-all">{profile.github_link}</span>
                </li>
              ) : null}
              {profile.credly_link ? (
                <li>
                  Credly: <span className="break-all">{profile.credly_link}</span>
                </li>
              ) : null}
            </ul>
          )}
        </header>

        <section className="mt-5 space-y-1" aria-labelledby="cv-education">
          <SectionTitle id="cv-education">Eğitim</SectionTitle>
          <div className="mt-2 grid gap-1 text-neutral-800 print:text-[10pt]">
            <p>
              <strong className="font-semibold text-neutral-900">{profile.university}</strong>
              {profile.department ? ` — ${profile.department}` : ""}
            </p>
            <p>
              Sınıf: {profile.class_level}
              {profile.student_status ? ` · ${profile.student_status}` : ""}
              {profile.enrollment_year != null ? ` · Giriş: ${profile.enrollment_year}` : ""}
              {profile.grade != null ? ` · Not ortalaması: ${profile.grade}` : ""}
            </p>
            {profile.cap_yandal_department?.trim() ? (
              <p>Çap / yan dal: {profile.cap_yandal_department}</p>
            ) : null}
          </div>
        </section>

        {expLines.length > 0 ? (
          <section className="mt-5" aria-labelledby="cv-exp">
            <SectionTitle id="cv-exp">Deneyim</SectionTitle>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-800 print:text-[10pt]">
              {expLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {projectLines.length > 0 ? (
          <section className="mt-5" aria-labelledby="cv-projects">
            <SectionTitle id="cv-projects">Projeler</SectionTitle>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-800 print:text-[10pt]">
              {projectLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {activityLines.length > 0 || certLines.length > 0 ? (
          <section className="mt-5" aria-labelledby="cv-extra">
            <SectionTitle id="cv-extra">Etkinlikler ve sertifikalar</SectionTitle>
            {activityLines.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase text-neutral-600 print:text-[9pt]">
                  Etkinlikler
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-800 print:text-[10pt]">
                  {activityLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {certLines.length > 0 ? (
              <div className={activityLines.length > 0 ? "mt-3" : "mt-2"}>
                <p className="text-xs font-semibold uppercase text-neutral-600 print:text-[9pt]">
                  Sertifikalar
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-800 print:text-[10pt]">
                  {certLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {skillLines.length > 0 ? (
          <section className="mt-5" aria-labelledby="cv-skills">
            <SectionTitle id="cv-skills">Beceriler</SectionTitle>
            <p className="mt-2 text-neutral-800 print:text-[10pt]">{skillLines.join(" · ")}</p>
          </section>
        ) : null}

        {langs.length > 0 ? (
          <section className="mt-5" aria-labelledby="cv-lang">
            <SectionTitle id="cv-lang">Yabancı diller</SectionTitle>
            <div className="mt-2 overflow-x-auto print:text-[10pt]">
              <table className="w-full border-collapse border border-neutral-400 text-left text-neutral-800">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border border-neutral-400 px-2 py-1 font-semibold">Dil</th>
                    <th className="border border-neutral-400 px-2 py-1 font-semibold">Okuma</th>
                    <th className="border border-neutral-400 px-2 py-1 font-semibold">Yazma</th>
                    <th className="border border-neutral-400 px-2 py-1 font-semibold">Dinleme</th>
                    <th className="border border-neutral-400 px-2 py-1 font-semibold">Konuşma</th>
                  </tr>
                </thead>
                <tbody>
                  {langs.map((lang, idx) => (
                    <tr key={`${lang.language}-${idx}`}>
                      <td className="border border-neutral-400 px-2 py-1">{lang.language}</td>
                      <td className="border border-neutral-400 px-2 py-1">{lang.reading}</td>
                      <td className="border border-neutral-400 px-2 py-1">{lang.writing}</td>
                      <td className="border border-neutral-400 px-2 py-1">{lang.listening}</td>
                      <td className="border border-neutral-400 px-2 py-1">{lang.speaking}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <footer className="mt-8 border-t border-neutral-300 pt-3 text-center text-[9pt] text-neutral-500 print:mt-6">
          Upschool Kariyer · CV çıktısı — ATS uyumlu düz metin yapısı
        </footer>
      </article>
    </div>
  );
});
