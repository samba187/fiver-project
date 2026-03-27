"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, CheckCircle, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const SLOTS = ["16h-17h", "17h-18h", "18h-19h", "19h-20h", "20h-21h", "21h-22h", "22h-23h", "23h-00h"];

interface Pitch {
  id: string;
  name: string;
  status: "available" | "maintenance";
  surface: string;
  dimensions: string;
}

export default function TerrainsPage() {
  const [pitches, setPitches] = useState<Pitch[]>([
    { id: "1", name: "Terrain 1", status: "available", surface: "Gazon synthétique 4ème génération", dimensions: "30m x 20m" },
    { id: "2", name: "Terrain 2", status: "available", surface: "Gazon synthétique 4ème génération", dimensions: "30m x 20m" },
  ]);
  const [activePitch, setActivePitch] = useState("1");
  const [schedule, setSchedule] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch pitch statuses from settings
      const { data: settingsData } = await supabase.from("settings").select("key, value").in("key", ["pitch_1_status", "pitch_2_status"]);
      if (settingsData) {
        const map = Object.fromEntries(settingsData.map((s) => [s.key, s.value]));
        setPitches((prev) => prev.map((p) => ({
          ...p,
          status: (p.id === "1" ? map.pitch_1_status : map.pitch_2_status) as "available" | "maintenance" || p.status,
        })));
      }

      // Fetch reservations for the current week
      const now = new Date();
      const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const { data } = await supabase
        .from("reservations")
        .select("date, time, pitch, status")
        .gte("date", monday.toISOString().split("T")[0])
        .lte("date", sunday.toISOString().split("T")[0])
        .neq("status", "cancelled");

      const lookup: Record<string, Record<string, boolean>> = { "1": {}, "2": {} };
      if (data) {
        for (const r of data) {
          const rDate = new Date(r.date);
          const dayIndex = (rDate.getDay() + 6) % 7;
          const pitchId = r.pitch === "Terrain 1" ? "1" : "2";
          lookup[pitchId][`${dayIndex}-${r.time}`] = true;
        }
      }
      setSchedule(lookup);
      setLoading(false);
    }
    fetchData();
  }, []);

  async function toggleStatus(id: string) {
    const pitch = pitches.find((p) => p.id === id);
    if (!pitch) return;
    const newStatus = pitch.status === "available" ? "maintenance" : "available";
    const settingKey = id === "1" ? "pitch_1_status" : "pitch_2_status";

    // Upsert in Supabase settings
    const { data: existing } = await supabase.from("settings").select("id").eq("key", settingKey).single();
    if (existing) {
      await supabase.from("settings").update({ value: newStatus }).eq("key", settingKey);
    } else {
      await supabase.from("settings").insert({ key: settingKey, value: newStatus });
    }

    setPitches((prev) =>
      prev.map((p) => p.id === id ? { ...p, status: newStatus } : p)
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fiver-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[var(--font-heading)] text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">Gestion des terrains</h1>
        <p className="mt-1 text-sm text-white/40">Gérez la disponibilité et le planning de vos terrains.</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {pitches.map((pitch) => (
          <div key={pitch.id} className={cn("rounded-lg border p-5 transition-colors", pitch.status === "available" ? "border-fiver-green/20 bg-fiver-green/5" : "border-amber-500/20 bg-amber-500/5")}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", pitch.status === "available" ? "bg-fiver-green/10" : "bg-amber-500/10")}>
                  <LayoutGrid className={cn("h-5 w-5", pitch.status === "available" ? "text-fiver-green" : "text-amber-400")} />
                </div>
                <div>
                  <h3 className="font-[var(--font-heading)] text-lg font-bold uppercase text-white">{pitch.name}</h3>
                  <p className="text-xs text-white/40">{pitch.dimensions}</p>
                </div>
              </div>
              {pitch.status === "available" ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-fiver-green"><CheckCircle className="h-3.5 w-3.5" /> Disponible</span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400"><Wrench className="h-3.5 w-3.5" /> Maintenance</span>
              )}
            </div>
            <p className="mb-4 text-sm text-white/50">{pitch.surface}</p>
            <button onClick={() => toggleStatus(pitch.id)} className={cn("w-full rounded-sm py-2.5 text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-90", pitch.status === "available" ? "bg-amber-500/20 text-amber-400" : "bg-fiver-green/20 text-fiver-green")}>
              {pitch.status === "available" ? "Mettre en maintenance" : "Remettre disponible"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-4 border-b border-white/5 px-5 py-4">
          <h2 className="font-[var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-white">Planning hebdomadaire</h2>
          <div className="flex gap-1 rounded-sm border border-white/10 bg-white/5 p-0.5">
            {pitches.map((p) => (
              <button key={p.id} onClick={() => setActivePitch(p.id)} className={cn("rounded-sm px-3 py-1 text-xs font-medium transition-colors", activePitch === p.id ? "bg-fiver-green text-fiver-black" : "text-white/40 hover:text-white/70")}>{p.name}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-white/30">Heure</th>
                {DAYS.map((d) => <th key={d} className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-white/30">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => (
                <tr key={slot} className="border-t border-white/5">
                  <td className="px-3 py-2 text-sm font-medium text-white/50">{slot.split("-")[0]}</td>
                  {DAYS.map((_, di) => {
                    const key = `${di}-${slot}`;
                    const occupied = schedule[activePitch]?.[key] ?? false;
                    return (
                      <td key={di} className="px-1 py-1 text-center">
                        <div className={cn("mx-auto h-8 w-full max-w-[60px] rounded-sm text-xs font-medium leading-8", occupied ? "bg-fiver-green/20 text-fiver-green" : "bg-white/5 text-white/20")}>
                          {occupied ? "Réservé" : "Libre"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 border-t border-white/5 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-white/30"><div className="h-3 w-3 rounded-sm bg-fiver-green/20" /> Réservé</div>
          <div className="flex items-center gap-2 text-xs text-white/30"><div className="h-3 w-3 rounded-sm bg-white/5" /> Libre</div>
        </div>
      </div>
    </div>
  );
}
