import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Ingresar — Admin MOVARA",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#2F2F2F] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/Logo.jpeg" alt="MOVARA" width={56} height={56} className="rounded-xl mb-4" />
          <p className="text-[#D4B06A] text-xs font-bold uppercase tracking-widest">Panel MOVARA</p>
          <h1 className="text-xl font-bold text-white mt-1">Ingresar</h1>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
