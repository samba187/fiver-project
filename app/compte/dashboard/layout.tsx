"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, User, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const CLIENT_LINKS = [
  { href: "/compte/dashboard", label: "Mes Réservations", icon: CalendarCheck },
  { href: "/compte/dashboard/profil", label: "Mon Profil", icon: User },
];

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/compte");
        return;
      }

      // Check if admin — redirect to admin space
      const userEmail = data.user.email?.toLowerCase() || "";
      if (userEmail.includes("admin") || userEmail.includes("staff")) {
        router.replace("/staff/dashboard");
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("name, is_suspended")
        .eq("id", data.user.id)
        .single();

      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        router.replace("/compte");
        return;
      }

      setUserName(profile?.name || "Client");
      setAuthed(true);
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/compte");
  }

  if (!authed) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-fiver-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-fiver-black">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 flex-col border-r border-white/5 bg-white/[0.01] lg:flex">
        <div className="flex items-center gap-3 border-b border-white/5 p-5">
          <Link href="/">
            <Image src="/logo.png" alt="Fiveur Arena" width={120} height={40} className="h-8 w-auto" />
          </Link>
        </div>

        <div className="border-b border-white/5 px-5 py-4">
          <p className="text-xs text-white/30 uppercase tracking-wide">Espace Client</p>
          <p className="mt-1 text-sm font-medium text-white truncate">{userName}</p>
        </div>

        <nav className="flex-1 p-3">
          {CLIENT_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors mb-1",
                  isActive ? "bg-fiver-green text-fiver-black" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                )}>
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-3">
          <button onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <Link href="/"><Image src="/logo.png" alt="Fiveur" width={100} height={33} className="h-7 w-auto" /></Link>
            <span className="text-xs text-white/30">|</span>
            <span className="text-xs font-medium text-white/60 truncate max-w-[120px]">{userName}</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/60">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="border-b border-white/5 bg-white/[0.02] p-3 lg:hidden">
            {CLIENT_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors mb-1",
                  pathname === link.href ? "bg-fiver-green text-fiver-black" : "text-white/50"
                )}>
                <link.icon className="h-4 w-4" /> {link.label}
              </Link>
            ))}
            <button onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-red-400/60 hover:bg-red-500/10 mt-2">
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
