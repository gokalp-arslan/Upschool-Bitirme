import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kariyer ve CV Platformu",
  description: "Next.js + Supabase + Tailwind CSS proje temeli"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="tr">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
