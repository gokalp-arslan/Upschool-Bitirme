/** `profiles.certificates` metin alanı: JSON veya eski düz metin */

export type CertificatesData = {
  notes: string;
  images: string[];
};

export function parseCertificatesField(raw: string | null): CertificatesData {
  if (!raw?.trim()) return { notes: "", images: [] };
  const t = raw.trim();
  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t) as Record<string, unknown>;
      if (o && typeof o === "object" && Array.isArray(o.images)) {
        const notes = typeof o.notes === "string" ? o.notes : "";
        const images = (o.images as unknown[]).filter((x): x is string => typeof x === "string");
        return { notes, images };
      }
    } catch {
      /* eski düz metin */
    }
  }
  return { notes: raw, images: [] };
}

export function serializeCertificatesField(
  notes: string,
  images: string[]
): string | null {
  const n = notes.trim();
  const imgs = images.filter((u) => u.trim().length > 0);
  if (!n && imgs.length === 0) return null;
  return JSON.stringify({ notes: n, images: imgs });
}
