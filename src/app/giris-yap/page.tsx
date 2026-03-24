import AuthForm from "@/components/auth-form";
import BackButton from "@/components/back-button";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 px-6 py-12">
      <div className="absolute left-6 top-20">
        <BackButton />
      </div>
      <AuthForm mode="login" />
    </main>
  );
}
