import Link from "next/link";
import Image from "next/image";
import { client } from "@/sanity/lib/client";
import { SITE_CONFIG_QUERY } from "@/sanity/lib/queries";

type FooterNavLink = { label?: string | null; url?: string | null };

type SiteConfigRaw = {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  instagram?: string | null;
  footerDescription?: string | null;
  footerNavLinks?: FooterNavLink[] | null;
  copyrightText?: string | null;
};

type ResolvedConfig = {
  email: string;
  phone: string;
  address: string;
  instagram: string;
  footerDescription: string;
  footerNavLinks: { label: string; url: string }[];
  copyrightText: string;
};

const FALLBACK_NAV_LINKS = [
  { label: "Modelos", url: "/modelos" },
  { label: "Configurador", url: "/configurador" },
  { label: "Quiénes somos", url: "/quienes-somos" },
  { label: "Cómo funciona", url: "/#proceso" },
  { label: "Testimonios", url: "/#testimonios" },
];

const FALLBACK: ResolvedConfig = {
  email: "info@movara.com.ar",
  phone: "+54 9 11 0000-0000",
  address: "Buenos Aires, Argentina",
  instagram: "https://instagram.com/movara",
  footerDescription:
    "Estamos repensando la forma de habitar. Casas modulares de calidad superior, fabricación argentina.",
  footerNavLinks: FALLBACK_NAV_LINKS,
  copyrightText: "MOVARA. Todos los derechos reservados.",
};

async function getSiteConfig(): Promise<ResolvedConfig> {
  try {
    const data = await client.fetch<SiteConfigRaw | null>(SITE_CONFIG_QUERY);
    if (data) {
      const navLinks =
        data.footerNavLinks && data.footerNavLinks.length > 0
          ? data.footerNavLinks
              .filter((l): l is { label: string; url: string } => !!l.label && !!l.url)
          : FALLBACK_NAV_LINKS;

      return {
        email: data.email ?? FALLBACK.email,
        phone: data.phone ?? FALLBACK.phone,
        address: data.address ?? FALLBACK.address,
        instagram: data.instagram ?? FALLBACK.instagram,
        footerDescription: data.footerDescription ?? FALLBACK.footerDescription,
        footerNavLinks: navLinks,
        copyrightText: data.copyrightText ?? FALLBACK.copyrightText,
      };
    }
  } catch {}
  return FALLBACK;
}

export default async function Footer() {
  const config = await getSiteConfig();

  const phoneHref = `tel:${config.phone.replace(/[\s\-()]/g, "")}`;
  const year = new Date().getFullYear();

  const contactLinks = [
    { label: config.email, href: `mailto:${config.email}` },
    { label: config.phone, href: phoneHref },
    { label: config.address, href: "#" },
  ];

  const social = [
    { label: "Instagram", href: config.instagram, icon: <InstagramIcon /> },
  ];

  return (
    <footer className="bg-sage-950 text-stone-400">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
              <Image src="/icono.png" alt="" height={48} width={48} className="h-12 w-auto object-contain" />
              <div className="flex flex-col leading-none gap-[3px]">
                <span style={{ fontFamily: "var(--font-montserrat)", fontWeight: 700, fontSize: "2.25rem", color: "#D4B06A", lineHeight: 1, letterSpacing: "-0.01em" }}>
                  MOVARA
                </span>
                <span style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400, fontSize: "0.6rem", color: "#D4B06A", letterSpacing: "0.3em", textTransform: "uppercase", lineHeight: 1 }}>
                  Espacios Modulares
                </span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-stone-500 max-w-xs">
              {config.footerDescription}
            </p>
            <div className="flex items-center gap-3 mt-6">
              {social.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-sage-900 border border-sage-800 flex items-center justify-center text-stone-500 hover:text-white hover:border-sage-600 transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav links (dinámico desde Sanity) */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Navegación</h3>
            <ul className="space-y-3">
              {config.footerNavLinks.map(({ label, url }) => (
                <li key={url}>
                  <Link
                    href={url}
                    className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto dinámico */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Contacto</h3>
            <ul className="space-y-3">
              {contactLinks.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-sage-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-stone-600 text-sm">
            © {year} {config.copyrightText}
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacidad" className="text-stone-600 hover:text-stone-400 transition-colors">
              Privacidad
            </Link>
            <Link href="/terminos" className="text-stone-600 hover:text-stone-400 transition-colors">
              Términos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

