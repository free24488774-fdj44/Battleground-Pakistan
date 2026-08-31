import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Wrench, Palette, Gauge } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { NeonButton } from "@/components/game/NeonButton";
import { toast } from "@/hooks/use-toast";
import { VEHICLES, getVehicle, applyMods, DEFAULT_MODS } from "@/lib/vehicles";

const PAINT_COLORS = [0x4a5664, 0xdd3322, 0x1a5aa8, 0x2a8a3a, 0xd4af37, 0x0d0d10, 0xe8e0d0, 0x8a3838];
const WHEEL_COLORS = [0x1a1a1a, 0x888888, 0xd4af37, 0xdd3322];

// Category ke hisab se alag silhouette (Garage preview ab har category ke liye alag dikhta hai)
const CATEGORY_SILHOUETTE: Record<string, { body: string; cabin: string; wheels: [number, number][] }> = {
  Hatchback: { body: "M28,60 Q22,38 48,33 L62,20 Q74,14 105,14 L120,20 L126,33 Q158,38 172,52 L174,60 Q174,68 164,68 L36,68 Q28,68 28,60 Z", cabin: "M64,32 L76,21 Q86,17 104,17 L118,22 L120,33 Z", wheels: [[62,68],[142,68]] },
  Sedan:     { body: "M20,60 Q15,35 45,30 L65,15 Q80,8 120,8 L140,15 Q165,20 180,35 L182,60 Q182,68 172,68 L28,68 Q20,68 20,60 Z", cabin: "M62,30 L78,16 Q90,11 118,11 L134,16 L138,30 Z", wheels: [[55,68],[150,68]] },
  SUV:       { body: "M18,62 Q16,28 42,26 L58,10 Q70,4 130,4 L146,10 L164,26 Q186,28 186,62 Q186,72 174,72 L28,72 Q18,72 18,62 Z", cabin: "M56,26 L68,12 Q78,8 128,8 L142,12 L150,26 Z", wheels: [[52,72],[154,72]] },
  Sports:    { body: "M15,62 Q12,48 40,44 L72,16 Q86,10 118,10 L146,20 Q172,30 188,50 L189,62 Q189,68 179,68 L24,68 Q15,68 15,62 Z", cabin: "M68,20 L84,13 Q96,9 114,10 L138,20 L140,32 L66,32 Z", wheels: [[54,68],[158,68]] },
  Muscle:    { body: "M14,60 Q12,36 44,32 L64,17 Q78,11 122,11 L142,17 L168,32 Q190,36 190,60 Q190,69 178,69 L26,69 Q14,69 14,60 Z", cabin: "M66,31 L80,18 Q90,14 116,14 L132,18 L140,31 Z", wheels: [[52,69],[156,69]] },
  Pickup:    { body: "M12,62 Q10,36 38,32 L56,16 Q68,10 100,10 L114,16 L120,32 L196,32 L200,62 Q200,70 190,70 L22,70 Q12,70 12,62 Z", cabin: "M54,31 L64,17 Q72,13 96,13 L108,17 L112,31 Z", wheels: [[46,70],[178,70]] },
  Offroad:   { body: "M16,58 Q14,30 44,27 L60,12 Q72,6 128,6 L146,12 L166,27 Q188,30 188,58 Q188,72 174,72 L30,72 Q16,72 16,58 Z", cabin: "M58,27 L70,13 Q80,9 126,9 L138,13 L148,27 Z", wheels: [[48,72],[156,72]] },
  Classic:   { body: "M22,60 Q18,38 46,33 L64,19 Q78,13 116,13 L134,19 L156,33 Q180,38 180,60 Q180,68 170,68 L30,68 Q22,68 22,60 Z", cabin: "M62,32 L76,20 Q86,16 114,16 L128,20 L134,32 Z", wheels: [[57,68],[145,68]] },
  Rally:     { body: "M16,62 Q14,32 44,28 L62,14 Q76,8 130,8 L148,14 L170,28 Q192,32 192,62 Q192,70 180,70 L28,70 Q16,70 16,62 Z", cabin: "M60,28 L72,15 Q82,11 128,11 L140,15 L150,28 Z", wheels: [[50,70],[158,70]] },
  Electric:  { body: "M18,60 Q14,40 44,35 L64,18 Q78,12 116,12 L136,18 L164,35 Q188,40 188,60 Q188,68 176,68 L30,68 Q18,68 18,60 Z", cabin: "M62,34 L78,19 Q88,15 114,15 L130,19 L142,34 Z", wheels: [[56,68],[150,68]] },
  Van:       { body: "M14,58 Q12,20 40,18 L44,10 Q48,6 160,6 Q170,6 172,18 Q198,20 198,58 Q198,70 186,70 L26,70 Q14,70 14,58 Z", cabin: "M46,17 L48,9 Q52,7 158,7 L166,17 Z", wheels: [[46,70],[168,70]] },
};

export default function Garage() {
  const [, setLocation] = useLocation();
  const { profile, selectedVehicleId, ownedVehicleIds, ownsVehicle, selectVehicle, buyVehicle, getVehicleMods, updateVehicleMods } = useGame();
  const [viewingId, setViewingId] = useState(selectedVehicleId);

  if (!profile) { setLocation("/login"); return null; }

  const viewing = getVehicle(viewingId);
  const mods = getVehicleMods(viewingId);
  const stats = applyMods(viewing.baseStats, mods);
  const owned = ownsVehicle(viewingId);
  const sil = CATEGORY_SILHOUETTE[viewing.category] || CATEGORY_SILHOUETTE.Sedan;

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
        <div className="text-amber-400 font-display font-bold">🪙 {profile.coins} PKR</div>
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
                <div className="text-amber-400 text-[10px] font-bold mt-1">🪙 {v.priceCoins} PKR</div>
              )}
            </button>
          ))}
        </div>

        {/* Vehicle preview */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-4">
          <div className="flex items-center justify-center h-40 mb-4">
            <svg viewBox="0 0 210 90" className="w-64 h-auto drop-shadow-2xl">
              <ellipse cx="105" cy="80" rx="95" ry="6" fill="#000" opacity="0.35" />
              <path d={sil.body} fill={`#${mods.paintColor.toString(16).padStart(6,"0")}`} stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />
              <path d={sil.cabin} fill="#91b6d8" opacity="0.7" />
              {sil.wheels.map(([wx,wy],i)=>(
                <g key={i}>
                  <circle cx={wx} cy={wy} r="14" fill={`#${mods.wheelColor.toString(16).padStart(6,"0")}`} stroke="#000" strokeOpacity="0.3" strokeWidth="2" />
                  <circle cx={wx} cy={wy} r="5" fill="#888" />
                </g>
              ))}
              <rect x="188" y="42" width="5" height="10" rx="1.5" fill="#ffcc66" />
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
            <NeonButton onClick={handleBuy} className="w-full">BUY — 🪙 {viewing.priceCoins} PKR</NeonButton>
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
                    {mods[key] >= 5 ? "MAX" : `🪙 ${(mods[key]+1)*1500} PKR`}
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
