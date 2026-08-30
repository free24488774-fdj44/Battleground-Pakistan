import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Wrench, Palette, Gauge } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { NeonButton } from "@/components/game/NeonButton";
import { toast } from "@/hooks/use-toast";
import { VEHICLES, getVehicle, applyMods, DEFAULT_MODS } from "@/lib/vehicles";

const PAINT_COLORS = [0x4a5664, 0xdd3322, 0x1a5aa8, 0x2a8a3a, 0xd4af37, 0x0d0d10, 0xe8e0d0, 0x8a3838];
const WHEEL_COLORS = [0x1a1a1a, 0x888888, 0xd4af37, 0xdd3322];

export default function Garage() {
  const [, setLocation] = useLocation();
  const { profile, selectedVehicleId, ownedVehicleIds, ownsVehicle, selectVehicle, buyVehicle, getVehicleMods, updateVehicleMods } = useGame();
  const [viewingId, setViewingId] = useState(selectedVehicleId);

  if (!profile) { setLocation("/login"); return null; }

  const viewing = getVehicle(viewingId);
  const mods = getVehicleMods(viewingId);
  const stats = applyMods(viewing.baseStats, mods);
  const owned = ownsVehicle(viewingId);

  const handleBuy = () => {
    const ok = buyVehicle(viewingId, viewing.priceCoins);
    if (ok) { toast({ title: "Vehicle Purchased", description: `${viewing.name} added to your garage.` }); selectVehicle(viewingId); }
    else toast({ title: "Not enough coins", description: "Earn more coins to buy this vehicle.", variant: "destructive" as any });
  };

  const handleSelect = () => { selectVehicle(viewingId); toast({ title: "Vehicle Selected", description: `${viewing.name} is now your active car.` }); };

  const upgrade = (key: "engineLevel" | "turboLevel" | "brakeLevel" | "tireLevel") => {
    const current = mods[key];
    if (current >= 5) return;
    const cost = (current + 1) * 1500;
    if ((profile.coins ?? 0) < cost) { toast({ title: "Not enough coins" }); return; }
    updateVehicleMods(viewingId, { [key]: current + 1 } as any);
    toast({ title: "Upgraded", description: `${key.replace("Level","")} → Level ${current + 1}` });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="p-4 flex justify-between items-center bg-black/50 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/lobby")} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-white">Garage</h1>
        </div>
        <div className="text-amber-400 font-display font-bold">🪙 {profile.coins}</div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {/* Vehicle carousel */}
        <div className="flex gap-3 overflow-x-auto pb-3 mb-4">
          {VEHICLES.map(v => (
            <button
              key={v.id}
              onClick={() => setViewingId(v.id)}
              className={`shrink-0 px-4 py-3 rounded-xl border-2 transition-all ${viewingId === v.id ? "border-primary bg-primary/10" : "border-white/10 bg-white/5"}`}
            >
              <div className="text-white font-display font-bold text-sm whitespace-nowrap">{v.name}</div>
              <div className="text-white/50 text-xs">{v.category}</div>
              {ownsVehicle(v.id) ? (
                <div className="text-emerald-400 text-[10px] font-bold mt-1">OWNED</div>
              ) : (
                <div className="text-amber-400 text-[10px] font-bold mt-1">🪙 {v.priceCoins}</div>
              )}
            </button>
          ))}
        </div>

        {/* Vehicle preview */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-4">
          <div className="flex items-center justify-center h-40 mb-4">
            <svg viewBox="0 0 200 90" className="w-64 h-auto drop-shadow-2xl">
              <ellipse cx="100" cy="80" rx="90" ry="6" fill="#000" opacity="0.35" />
              <path d="M20,60 Q15,35 45,30 L65,15 Q80,8 120,8 L140,15 Q165,20 180,35 L182,60 Q182,68 172,68 L28,68 Q20,68 20,60 Z"
                fill={`#${mods.paintColor.toString(16).padStart(6,"0")}`} stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />
              <path d="M62,30 L78,16 Q90,11 118,11 L134,16 L138,30 Z" fill="#91b6d8" opacity="0.7" />
              <line x1="100" y1="12" x2="100" y2="30" stroke="#00000030" strokeWidth="1.5" />
              <circle cx="55" cy="68" r="14" fill={`#${mods.wheelColor.toString(16).padStart(6,"0")}`} stroke="#000" strokeOpacity="0.3" strokeWidth="2" />
              <circle cx="55" cy="68" r="5" fill="#888" />
              <circle cx="150" cy="68" r="14" fill={`#${mods.wheelColor.toString(16).padStart(6,"0")}`} stroke="#000" strokeOpacity="0.3" strokeWidth="2" />
              <circle cx="150" cy="68" r="5" fill="#888" />
              <rect x="178" y="42" width="5" height="10" rx="1.5" fill="#ffcc66" />
            </svg>
          </div>
          <h2 className="text-center font-display text-xl font-bold text-white">{viewing.name}</h2>
          <p className="text-center text-white/50 text-sm mb-4">{viewing.category} — {viewing.baseStats.drivetrain}</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatBar label="Speed" value={stats.topSpeedKmh} max={280} suffix=" km/h" />
            <StatBar label="Acceleration" value={stats.acceleration} max={10} />
            <StatBar label="Braking" value={stats.braking} max={10} />
            <StatBar label="Grip" value={stats.grip} max={10} />
          </div>

          {owned ? (
            viewingId === selectedVehicleId ? (
              <div className="text-center text-emerald-400 font-display font-bold text-sm py-2">✓ ACTIVE VEHICLE</div>
            ) : (
              <NeonButton onClick={handleSelect} className="w-full">SELECT VEHICLE</NeonButton>
            )
          ) : (
            <NeonButton onClick={handleBuy} className="w-full">BUY — 🪙 {viewing.priceCoins}</NeonButton>
          )}
        </div>

        {owned && (
          <>
            {/* Paint & wheels */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3"><Palette className="w-5 h-5 text-primary" /><h3 className="font-display font-bold text-white uppercase tracking-wider text-sm">Paint & Wheels</h3></div>
              <p className="text-white/50 text-xs mb-2">Paint Color</p>
              <div className="flex gap-2 mb-4 flex-wrap">
                {PAINT_COLORS.map(c => (
                  <button key={c} onClick={() => updateVehicleMods(viewingId, { paintColor: c })}
                    className={`w-9 h-9 rounded-full border-2 ${mods.paintColor === c ? "border-white scale-110" : "border-white/20"}`}
                    style={{ backgroundColor: `#${c.toString(16).padStart(6,"0")}` }} />
                ))}
              </div>
              <p className="text-white/50 text-xs mb-2">Wheel Color</p>
              <div className="flex gap-2 mb-4 flex-wrap">
                {WHEEL_COLORS.map(c => (
                  <button key={c} onClick={() => updateVehicleMods(viewingId, { wheelColor: c })}
                    className={`w-9 h-9 rounded-full border-2 ${mods.wheelColor === c ? "border-white scale-110" : "border-white/20"}`}
                    style={{ backgroundColor: `#${c.toString(16).padStart(6,"0")}` }} />
                ))}
              </div>
              <p className="text-white/50 text-xs mb-2">Finish</p>
              <div className="flex gap-2">
                {(["matte","gloss","metallic"] as const).map(f => (
                  <button key={f} onClick={() => updateVehicleMods(viewingId, { finish: f })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase ${mods.finish === f ? "bg-primary text-black font-bold" : "bg-white/10 text-white/60"}`}>{f}</button>
                ))}
              </div>
            </div>

            {/* Performance upgrades */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3"><Wrench className="w-5 h-5 text-primary" /><h3 className="font-display font-bold text-white uppercase tracking-wider text-sm">Performance Upgrades</h3></div>
              {([["engineLevel","Engine"],["turboLevel","Turbo"],["brakeLevel","Brakes"],["tireLevel","Tires"]] as const).map(([key,label]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-white text-sm font-display">{label}</div>
                    <div className="text-white/40 text-xs">Level {mods[key]}/5</div>
                  </div>
                  <button onClick={() => upgrade(key)} disabled={mods[key] >= 5}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/50 text-primary text-xs font-display font-bold disabled:opacity-30">
                    {mods[key] >= 5 ? "MAX" : `🪙 ${(mods[key]+1)*1500}`}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatBar({ label, value, max, suffix = "" }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="text-white font-bold">{Math.round(value)}{suffix}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
