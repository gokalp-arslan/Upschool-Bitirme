"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

function mapAuthError(message: string) {
  const text = message.toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "E-posta veya sifre hatali. Lutfen bilgilerini kontrol et.";
  }

  if (text.includes("email not confirmed")) {
    return "E-posta adresini dogrulaman gerekiyor. Lutfen gelen kutunu kontrol et.";
  }

  if (text.includes("failed to fetch") || text.includes("network")) {
    return "Sunucuya su an ulasilamiyor. Lutfen internet baglantini kontrol edip tekrar dene.";
  }

  if (text.includes("password should be at least")) {
    return "Sifre en az 6 karakter olmali.";
  }

  return "Islem su an tamamlanamadi. Lutfen biraz sonra tekrar dene.";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isLogin = mode === "login";
  const ctaText = useMemo(() => (isLogin ? "Giris Yap" : "Kayit Ol"), [isLogin]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const { client, error } = getSupabaseClient();
      if (error || !client) {
        setErrorMessage(error ?? "Supabase baglantisi olusturulamadi.");
        return;
      }

      if (isLogin) {
        const { error: signInError } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setErrorMessage(mapAuthError(signInError.message));
          return;
        }

        router.refresh();
        router.push("/");
        return;
      }

      const { data: signUpData, error: signUpError } = await client.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        setErrorMessage(mapAuthError(signUpError.message));
        return;
      }

      if (signUpData.session) {
        router.refresh();
        router.push("/");
        return;
      }

      setSuccessMessage(
        "Kayit basarili. E-posta dogrulama gerekiyorsa lutfen gelen kutunu kontrol et. Onaydan sonra giris yaparak panele donebilirsin."
      );
    } catch {
      setErrorMessage(
        "Beklenmeyen bir hata olustu. Lutfen bilgilerini kontrol ederek tekrar dene."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
      <h1 className="text-2xl font-semibold text-slate-900">{ctaText}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {isLogin
          ? "Hesabina giris yaptiktan sonra ana ekrandan tum modullere ulasabilirsin."
          : "Yeni hesap olustur; onay sonrasi ana ekrana yonlendirilirsin."}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">E-posta</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4"
            placeholder="ornek@mail.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Sifre</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none ring-indigo-100 transition focus:border-indigo-500 focus:ring-4"
            placeholder="••••••••"
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={6}
            required
          />
        </label>

        {errorMessage ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {isSubmitting ? "Lutfen bekleyin..." : ctaText}
        </button>
      </form>

      <div className="mt-5 text-sm text-slate-600">
        {isLogin ? "Hesabin yok mu?" : "Zaten bir hesabin var mi?"}{" "}
        <Link
          href={isLogin ? "/kayit-ol" : "/giris-yap"}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          {isLogin ? "Kayit ol" : "Giris yap"}
        </Link>
      </div>
    </div>
  );
}
