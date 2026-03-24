import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase Storage: public bucket; Dashboard'ta oluşturulmalı (RLS: auth kullanıcıları yükleme). */
export const PROFILE_UPLOAD_BUCKET = "profile-uploads";

const MAX_BYTES = 5 * 1024 * 1024;

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name.trim());
}

function isAllowedCertificateFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (isPdfFile(file)) return true;
  return /\.(png|jpe?g|gif|webp|pdf)$/i.test(file.name);
}

export async function uploadProfileImage(
  client: SupabaseClient,
  userId: string,
  file: File,
  kind: "avatar" | "certificate"
): Promise<{ publicUrl: string } | { error: string }> {
  if (kind === "avatar") {
    if (!file.type.startsWith("image/")) {
      return { error: "Yalnızca görsel dosyaları yükleyebilirsiniz." };
    }
  } else if (!isAllowedCertificateFile(file)) {
    return {
      error: "Sertifika için PNG, JPG, WebP, GIF veya PDF yükleyebilirsiniz."
    };
  }

  if (file.size > MAX_BYTES) {
    return { error: "Dosya boyutu 5 MB'ı geçemez." };
  }

  const ext =
    kind === "certificate" && isPdfFile(file) ? "pdf" : extFromFile(file);
  const folder = kind === "avatar" ? "avatar" : "certificates";
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const contentType =
    kind === "certificate" && isPdfFile(file)
      ? "application/pdf"
      : file.type || (ext === "pdf" ? "application/pdf" : `image/${ext}`);

  const { error } = await client.storage.from(PROFILE_UPLOAD_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType
  });

  if (error) {
    return {
      error:
        error.message ||
        "Yükleme başarısız. Supabase Storage’da 'profile-uploads' bucket’ını kontrol edin."
    };
  }

  const { data } = client.storage.from(PROFILE_UPLOAD_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}

/** Profil fotoğrafı alanında görsel URL’si mi (http/https) */
export function isProfilePhotoImageUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  return /^https?:\/\//i.test(v);
}

/** Sertifika eklerinde PDF URL’si (yol .pdf ile biter) */
export function isCertificatePdfUrl(url: string): boolean {
  const u = url.trim();
  try {
    const path = new URL(u).pathname.toLowerCase();
    return path.endsWith(".pdf");
  } catch {
    return u.toLowerCase().includes(".pdf");
  }
}
