"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/concept", label: "Concept" },
  { href: "/centre-de-loisirs", label: "Centre de Loisirs" },
  { href: "/academy", label: "Fiveur Academy" },
  { href: "/solidarite", label: "Solidarity" },
  { href: "/contact", label: "Contact" },
];

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-fiver-black/95 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="FIVER Soccer" width={150} height={50} className="h-10 w-auto" priority />
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors",
                  pathname === link.href
                    ? "text-fiver-green"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/#booking"
          className="hidden rounded-sm bg-fiver-green px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-fiver-black transition-opacity hover:opacity-90 lg:block"
        >
          Reserver
        </Link>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-primary-foreground lg:hidden"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-primary-foreground/10 bg-fiver-black lg:hidden">
          <ul className="flex flex-col px-4 py-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block py-3 text-base font-medium uppercase tracking-wide transition-colors",
                    pathname === link.href
                      ? "text-fiver-green"
                      : "text-primary-foreground/70 hover:text-primary-foreground"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-4">
              <Link
                href="/#booking"
                onClick={() => setMobileOpen(false)}
                className="block rounded-sm bg-fiver-green py-3 text-center text-sm font-semibold uppercase tracking-wide text-fiver-black"
              >
                Reserver un terrain
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
