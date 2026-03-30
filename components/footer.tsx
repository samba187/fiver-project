import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-fiver-black text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Image src="/logo.png" alt="FIVEUR ARENA" width={150} height={50} className="h-12 w-auto object-contain" />
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/60">
              Le premier complexe de football Five-a-Side a Nouakchott.
              Deux terrains, une passion.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-widest text-fiver-green">
              Navigation
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link href="/" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/concept" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">
                  Concept
                </Link>
              </li>
              <li>
                <Link href="/centre-de-loisirs" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">
                  Centre de Loisirs
                </Link>
              </li>
              <li>
                <Link href="/academy" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">
                  Fiveur Academy
                </Link>
              </li>
              <li>
                <Link href="/solidarite" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">
                  Solidarity
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-widest text-fiver-green">
              Contact
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li className="flex items-center gap-2 text-sm text-primary-foreground/60">
                <MapPin className="h-4 w-4 shrink-0" />
                Nouakchott, Mauritanie
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/60">
                <Phone className="h-4 w-4 shrink-0" />
                +222 XX XX XX XX
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/60">
                <Mail className="h-4 w-4 shrink-0" />
                contact@fiversoccer.com
              </li>
            </ul>
          </div>

          {/* Horaires */}
          <div>
            <h3 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-widest text-fiver-green">
              Horaires
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li className="text-sm text-primary-foreground/60">
                <span className="text-primary-foreground/80">Lun - Ven:</span> 16h - 00h
              </li>
              <li className="text-sm text-primary-foreground/60">
                <span className="text-primary-foreground/80">Sam - Dim:</span> 10h - 00h
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 md:flex-row">
          <p className="text-xs text-primary-foreground/40">
            &copy; {new Date().getFullYear()} FIVEUR ARENA. Tous droits reserves.
          </p>
          <Link
            href="/staff"
            className="text-xs text-primary-foreground/30 transition-colors hover:text-primary-foreground/60"
          >
            Connexion Staff
          </Link>
        </div>
      </div>
    </footer>
  );
}
