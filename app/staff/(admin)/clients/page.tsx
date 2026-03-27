"use client";

import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  total_bookings: number;
  last_booking: string;
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
            <div key={client.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fiver-green/10 text-sm font-bold text-fiver-green">
                  {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/80">{client.name}</p>
                  <p className="text-xs text-white/30">{client.email || "—"}</p>
                </div>
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
