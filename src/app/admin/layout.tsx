import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin — MOVARA",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F9F5EE]">
      <header className="py-6 flex justify-center">
        <Link href="/admin/configuraciones">
          <Image src="/Logo.jpeg" alt="MOVARA" width={40} height={40} className="rounded-lg" />
        </Link>
      </header>
      {children}
    </div>
  );
}
