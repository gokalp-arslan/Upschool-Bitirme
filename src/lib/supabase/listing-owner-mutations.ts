import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type ListingTable = "internships" | "trainings";

/** RLS / sahiplik: 0 satır etkilendiğinde gösterilecek mesaj */
export const LISTING_FORBIDDEN_MESSAGE =
  "Yetki hatası: Bu ilan size ait değil";

export type ListingOwnerResult = {
  data: { id: string }[] | null;
  error: PostgrestError | null;
  /** Hata yok ama güncelleme/silme 0 satır (yetki / eklenen ilan size ait değil) */
  forbidden: boolean;
};

/** PostgREST / UUID: id her zaman string olarak gönderilir */
function normalizeListingId(rowId: string | number): string {
  if (typeof rowId === "number") {
    return String(rowId);
  }
  return rowId.trim();
}

function normalizeUserId(userId: string): string {
  return userId.trim();
}

function finishMutationResult(
  data: { id: string }[] | null,
  error: PostgrestError | null
): ListingOwnerResult {
  if (error) {
    return { data: null, error, forbidden: false };
  }
  if (!data?.length) {
    return { data, error: null, forbidden: true };
  }
  return { data, error: null, forbidden: false };
}

/**
 * İlan güncelleme — yalnızca `added_by` eşleşmesi.
 * `.select("id")` ile gerçekten satır dönüp dönmediği kontrol edilir.
 */
export async function updateListingAsOwner<T extends object>(
  client: SupabaseClient,
  table: ListingTable,
  rowId: string | number,
  userId: string,
  payload: T
): Promise<ListingOwnerResult> {
  const id = normalizeListingId(rowId);
  const uid = normalizeUserId(userId);

  const { data, error } = await client
    .from(table)
    .update(payload)
    .eq("id", id)
    .eq("added_by", uid)
    .select("id");

  return finishMutationResult(data, error);
}

/**
 * Önce ilgili başvuruları siler (FK engeli), sonra ilanı `added_by` ile siler.
 */
export async function deleteListingAsOwner(
  client: SupabaseClient,
  table: ListingTable,
  rowId: string | number,
  userId: string
): Promise<ListingOwnerResult> {
  const id = normalizeListingId(rowId);
  const uid = normalizeUserId(userId);

  if (table === "internships") {
    const { error: appErr } = await client
      .from("internship_applications")
      .delete()
      .eq("internship_id", id);
    if (appErr) {
      return { data: null, error: appErr, forbidden: false };
    }
  } else {
    const { error: appErr } = await client
      .from("training_applications")
      .delete()
      .eq("training_id", id);
    if (appErr) {
      return { data: null, error: appErr, forbidden: false };
    }
  }

  const { data, error } = await client
    .from(table)
    .delete()
    .eq("id", id)
    .eq("added_by", uid)
    .select("id");

  return finishMutationResult(data, error);
}
