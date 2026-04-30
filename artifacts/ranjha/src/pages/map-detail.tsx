import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Skull, Package, Crosshair, Car, ShieldCheck, Target, Cloud, Users, Flame } from "lucide-react";
import { MAPS } from "@/lib/mock-data";
import { useGame } from "@/contexts/GameContext";
import type { MapPOI } from "@/lib/types";

const POI_STYLE: Record<MapPOI["type"], { color: string; bg: string; icon: typeof MapPin }> = {
  "Loot":     { color: "text-amber-300",   bg: "bg-amber-500",   icon: Package },
  "Sniper":   { color: "text-cyan-300",    bg: "bg-cyan-500",    icon: Crosshair },
  "Vehicle":  { color: "text-emerald-300", bg: "bg-emerald-500", icon: Car },
  "Safe":     { color: "text-blue-300",    bg: "bg-blue-500",    icon: ShieldCheck },
  "Hot Zone": { color: "text-red-300",     bg: "bg-red-500",     icon: Flame },
  "Boss":     { color: "text-fuchsia-300", bg: "bg-fuchsia-500", icon: Skull },
};

const LOOT_TIER_COLOR: Record<string, string> = {
  "Low":     "text-white/70 border-white/30",
  "Medium":  "text-cyan-300 border-cyan-500/40",
  "High":    "text-primary border-primary/50",
  "Extreme": "text-fuchsia-400 border-fuchsia-500/50",
};

export default function MapDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/map/:id");
  const { selectMap } = useGame();
  const map = MAPS.find(m => m.id === params?.id);

  if (!map) {
    setLocation("/lobby");
    return null;
  }

  const dangerStars = "▰".repeat(map.dangerLevel) + "▱".repeat(5 - map.dangerLevel);

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans overflow-x-hidden">
      {/* Hero photo */}
      <div className="relative w-full h-[55vh] md:h-[60vh]">
        <img src={map.image} alt={map.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

        <button
          onClick={() => setLocation("/lobby")}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-display uppercase tracking-widest"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Lobby
        </button>

        {map.isMain && (
          <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-md bg-secondary text-white text-[10px] font-display font-bold tracking-widest uppercase">
            Main Battleground
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
          <div className="text-[10px] uppercase tracking-[0.4em] text-primary/80 font-display mb-2">
            {map.region}
          </div>
          <h1 className="horror-title text-5xl md:text-7xl text-white tracking-widest drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
            {map.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded bg-white/10 border border-white/20 text-[10px] uppercase tracking-widest font-display">{map.climate}</span>
            <span className="px-2.5 py-1 rounded bg-white/10 border border-white/20 text-[10px] uppercase tracking-widest font-display">{map.terrain}</span>
            <span className={`px-2.5 py-1 rounded bg-black/40 border text-[10px] uppercase tracking-widest font-display font-bold ${LOOT_TIER_COLOR[map.lootTier]}`}>
              Loot · {map.lootTier}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatBlock icon={Users}  label="Players"       value={`${map.players}`} />
          <StatBlock icon={Target} label="Recommended"   value={map.recommendedMode} />
          <StatBlock icon={Cloud}  label="Weather"       value={map.weather} />
          <StatBlock icon={Package} label="Loot Tier"    value={map.lootTier} />
          <StatBlock icon={Skull}  label="Danger"        value={dangerStars} valueClass="font-mono text-red-400 tracking-widest" />
        </div>

        {/* Description */}
        <div className="glass-panel rounded-xl border border-white/10 p-5 md:p-6 bg-white/5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-display mb-2">Field Briefing</div>
          <p className="text-sm md:text-base text-white/80 leading-relaxed">{map.description}</p>
        </div>

        {/* POI map + list */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Annotated map */}
          <div className="lg:col-span-3 rounded-xl overflow-hidden border border-white/10 bg-black/40 relative aspect-[4/3]">
            <img src={map.image} alt={map.name} className="absolute inset-0 w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-black/40" />
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
              backgroundSize: "10% 10%"
            }} />
            {/* Safe zone */}
            <div className="absolute top-1/2 left-1/2 w-[80%] h-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/60 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 w-[40%] h-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/30 border-dashed pointer-events-none" />

            {/* POI markers */}
            {map.pois.map((p, i) => {
              const style = POI_STYLE[p.type];
              const Icon = style.icon;
              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.08, type: "spring" }}
                    className={`w-7 h-7 rounded-full ${style.bg} ring-2 ring-white/80 shadow-lg flex items-center justify-center cursor-pointer hover:scale-125 transition-transform`}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                  <div className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-widest bg-black/80 text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {p.name}
                  </div>
                </div>
              );
            })}
            <div className="absolute bottom-2 left-3 text-[10px] font-display uppercase tracking-widest text-white/70">
              Tactical map · {map.pois.length} key locations
            </div>
          </div>

          {/* POI list */}
          <div className="lg:col-span-2 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-display mb-1">Points of Interest</div>
            {map.pois.map((p, i) => {
              const style = POI_STYLE[p.type];
              const Icon = style.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-start gap-3 hover:border-primary/40 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg ${style.bg}/20 border ${style.color.replace("text-", "border-")} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm uppercase tracking-wider text-white truncate">{p.name}</span>
                      <span className={`text-[9px] uppercase tracking-widest font-display ${style.color} shrink-0`}>{p.type}</span>
                    </div>
                    <p className="text-[11px] text-white/60 mt-0.5 leading-snug">{p.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Vehicles */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-display mb-3">Available Vehicles</div>
          <div className="flex flex-wrap gap-2">
            {map.vehicles.map((v, i) => (
              <span key={i} className="px-3 py-1.5 rounded-md bg-black/40 border border-white/10 text-xs font-display uppercase tracking-wider flex items-center gap-2">
                <Car className="w-3.5 h-3.5 text-emerald-400" /> {v}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => { selectMap(map); setLocation("/matchmaking"); }}
            className="flex-1 py-4 bg-primary text-primary-foreground font-display font-bold text-lg uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(244,180,26,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            Drop Into {map.name}
          </button>
          <button
            onClick={() => { selectMap(map); setLocation("/lobby"); }}
            className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-display font-bold uppercase tracking-widest rounded-xl text-sm"
          >
            Set as Active Map
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ icon: Icon, label, value, valueClass = "" }: { icon: typeof MapPin; label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-display text-white/50">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`mt-1 text-sm font-display font-bold uppercase tracking-wider text-white ${valueClass}`}>{value}</div>
    </div>
  );
}
