"use client";

import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  total_bookings: number;
  last_booking: string;
  is_banned?: boolean;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchClients() {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .order("total_bookings", { ascending: false });
      setClients(data || []);
      setLoading(false);
    }
    fetchClients();
  }, []);

  async function toggleBan(client: Client) {
    const newStatus = !client.is_banned;
    const confirmMsg = newStatus 
      ? `Êtes-vous sûr de vouloir bannir ${client.name} ? Il ne pourra plus réserver.`
      : `Autoriser à nouveau ${client.name} à réserver ?`;
    if (window.confirm(confirmMsg)) {
      await supabase.from("clients").update({ is_banned: newStatus }).eq("id", client.id);
      setClients(clients.map(c => c.id === client.id ? { ...c, is_banned: newStatus } : c));
    }
  }

  const filtered = useMemo(() => {
    if (!search) return clients;
    const s = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        (c.email && c.email.toLowerCase().includes(s))
    );
  }, [clients, search]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Clients</h1>
        <p className="mt-1 text-sm text-white/40">{clients.length} client(s) enregistré(s)</p>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input type="text" placeholder="Rechercher par nom, téléphone ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-sm text-white/30">Aucun client trouvé.</div>
        ) : (
          filtered.map((client) => (
            <div key={client.id} className={cn("relative rounded-lg border bg-white/[0.02] p-4 transition-colors", client.is_banned ? "border-red-500/30 opacity-75" : "border-white/5 hover:border-white/10")}>
              {client.is_banned && <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-red-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500">Banni</div>}
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold", client.is_banned ? "bg-red-500/10 text-red-500" : "bg-fiver-green/10 text-fiver-green")}>
                    {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", client.is_banned ? "text-red-400 line-through" : "text-white/80")}>{client.name}</p>
                    <p className="text-xs text-white/30">{client.email || "—"}</p>
                  </div>
                </div>
                <button onClick={() => toggleBan(client)} className={cn("rounded-sm border px-2 py-1.5 text-xs font-medium transition-colors", client.is_banned ? "border-white/10 text-white/60 hover:bg-white/10 hover:text-white" : "border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:text-red-500")}>
                  {client.is_banned ? "Débannir" : "Bannir"}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-sm bg-white/5 p-2.5">
                <div className="text-center">
                  <p className="font-[var(--font-heading)] text-lg font-bold text-white">{client.total_bookings}</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/30">Résa.</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white/60">{client.phone.slice(-8)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/30">Tél.</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white/60">
                    {client.last_booking ? new Date(client.last_booking).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-white/30">Dernière</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
