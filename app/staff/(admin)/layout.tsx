"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarCheck,
  LayoutGrid,
  Users,
  ClipboardList,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const SIDEBAR_LINKS = [
  { href: "/staff/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/staff/reservations", label: "Réservations", icon: CalendarCheck },
  { href: "/staff/academy-pro", label: "Academy & Loisirs", icon: ClipboardList },
  { href: "/staff/contacts", label: "Messages", icon: MessageCircle },
  { href: "/staff/terrains", label: "Terrains", icon: LayoutGrid },
  { href: "/staff/clients", label: "Clients", icon: Users },
  { href: "/staff/rapports", label: "Rapports", icon: BarChart3 },
  { href: "/staff/corbeille", label: "Corbeille", icon: Trash2 },
  { href: "/staff/parametres", label: "Paramètres", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("Admin");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/staff");
      } else {
        setAuthed(true);
        setUserEmail(data.user.email || "Admin");
      }
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    document.cookie = "fiver_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    router.replace("/staff");
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fiver-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  const displayName = userEmail.split("@")[0] || "Admin";

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden bg-[#0d0d0d]">
      {/* Sidebar — Desktop */}
      <aside className="hidden w-64 flex-col border-r border-white/5 bg-fiver-black lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-6">
          <Image src="/logo.png" alt="FIVER" width={100} height={32} className="h-7 w-auto" />
        </div>
        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {SIDEBAR_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-fiver-green/10 text-fiver-green"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-white/5 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fiver-green/20 text-xs font-bold text-fiver-green">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">{displayName}</p>
              <p className="text-xs text-white/40">Administrateur</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/40 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-white/5 bg-fiver-black px-4 lg:hidden">
          <Image src="/logo.png" alt="FIVER" width={80} height={28} className="h-6 w-auto" />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/70" aria-label="Menu">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-fiver-black">
              <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
                <Image src="/logo.png" alt="FIVER" width={80} height={28} className="h-6 w-auto" />
                <button onClick={() => setSidebarOpen(false)} className="text-white/70">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4">
                <ul className="flex flex-col gap-1">
                  {SIDEBAR_LINKS.map((link) => {
                    const active = pathname === link.href;
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                            active
                              ? "bg-fiver-green/10 text-fiver-green"
                              : "text-white/50 hover:bg-white/5 hover:text-white/80"
                          )}
                        >
                          <link.icon className="h-4 w-4" />
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="border-t border-white/5 p-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/40 transition-colors hover:bg-white/5 hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
