"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Eye, Trash2, Mail, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  subject: string;
  message: string | null;
  created_at: string;
}

const SUBJECT_LABELS: Record<string, string> = {
  reservation: "Réservation",
  inscription_academy: "Inscription Academy",
  inscription_loisirs: "Inscription Loisirs",
  partenariat: "Partenariat",
  solidarite: "Solidarité",
  autre: "Autre",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  async function deleteContact(id: number) {
    await supabase.from("contacts").delete().eq("id", id);
    fetchContacts();
    if (selectedContact?.id === id) setSelectedContact(null);
  }

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (filterSubject !== "all" && c.subject !== filterSubject) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search) && !(c.email || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [contacts, search, filterSubject]);

  const subjectBadge = (subject: string) => {
    const label = SUBJECT_LABELS[subject] || subject;
    const colors: Record<string, string> = {
      reservation: "bg-blue-500/10 text-blue-400",
      inscription_academy: "bg-fiver-green/10 text-fiver-green",
      inscription_loisirs: "bg-emerald-500/10 text-emerald-400",
      partenariat: "bg-purple-500/10 text-purple-400",
      solidarite: "bg-amber-500/10 text-amber-400",
      autre: "bg-white/5 text-white/50",
    };
    return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", colors[subject] || colors.autre)}>{label}</span>;
  };

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
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Messages & Demandes</h1>
        <p className="mt-1 text-sm text-white/40">{contacts.length} message(s) au total</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-fiver-green focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1">
          {[{ key: "all", label: "Tous" }, { key: "inscription_academy", label: "Academy" }, { key: "inscription_loisirs", label: "Loisirs" }, { key: "reservation", label: "Résa" }, { key: "partenariat", label: "Partenaire" }, { key: "autre", label: "Autre" }].map((f) => (
            <button key={f.key} onClick={() => setFilterSubject(f.key)} className={cn("rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors", filterSubject === f.key ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className={cn("flex-1 rounded-lg border border-white/5 bg-white/[0.02]", selectedContact && "hidden lg:block")}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs font-medium uppercase tracking-wide text-white/30">
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Sujet</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-white/30">Aucun message trouvé.</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className={cn("border-b border-white/5 transition-colors hover:bg-white/[0.02] cursor-pointer", selectedContact?.id === c.id && "bg-white/[0.04]")} onClick={() => setSelectedContact(c)}>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-white/80">{c.name}</p>
                        <p className="text-xs text-white/30">{c.phone}</p>
                      </td>
                      <td className="px-5 py-3.5">{subjectBadge(c.subject)}</td>
                      <td className="px-5 py-3.5 text-sm text-white/60">
                        {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedContact(c); }} className="rounded-sm p-1.5 text-fiver-green/60 transition-colors hover:bg-fiver-green/10 hover:text-fiver-green" title="Voir"><Eye className="h-4 w-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); deleteContact(c.id); }} className="rounded-sm p-1.5 text-red-400/60 transition-colors hover:bg-red-400/10 hover:text-red-400" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedContact && (
          <div className="w-full rounded-lg border border-white/5 bg-white/[0.02] p-6 lg:w-96">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Détails</h3>
              <button onClick={() => setSelectedContact(null)} className="rounded-sm p-1 text-white/30 hover:text-white/60"><XIcon className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/30">Nom</p>
                <p className="mt-1 text-sm font-medium text-white/80">{selectedContact.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-white/30">Téléphone</p>
                <p className="mt-1 text-sm text-white/60">{selectedContact.phone}</p>
              </div>
              {selectedContact.email && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/30">Email</p>
                  <p className="mt-1 text-sm text-white/60">{selectedContact.email}</p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-white/30">Sujet</p>
                <div className="mt-1">{subjectBadge(selectedContact.subject)}</div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-white/30">Date</p>
                <p className="mt-1 text-sm text-white/60">
                  {new Date(selectedContact.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {selectedContact.message && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/30">Message</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-sm bg-white/5 p-3 text-sm leading-relaxed text-white/70">{selectedContact.message}</p>
                </div>
              )}
              <button onClick={() => deleteContact(selectedContact.id)} className="mt-2 flex items-center justify-center gap-2 rounded-sm bg-red-500/10 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20">
                <Trash2 className="h-3.5 w-3.5" /> Supprimer ce message
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
