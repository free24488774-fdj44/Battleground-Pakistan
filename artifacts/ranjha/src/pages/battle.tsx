import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Shield, Crosshair, Users, Skull, MessageSquare, Volume2, ChevronUp,
  Flame, Pause, Backpack, Zap, Wind, ArrowUp, ArrowDown, Activity,
  Bomb, CloudFog, Pill,
} from "lucide-react";
import { useGame } from "@/contexts/GameContext";

type Mode = "solo" | "duo" | "squad";
type Posture = "stand" | "crouch" | "prone";

const TEAMMATE_NAMES = ["LahoriKing", "PindiBoy", "QuettaDon"];
const ENEMY_NAMES = [
  "DesertViper", "ShadowKhan", "BalochRaider", "PunjabiRanger", "KarakoramKid",
  "MultanMurad", "SwatStrike", "SindhuStorm", "ChakwalChaser", "MardanMaverick",
  "BannuBlaze", "GwadarGhost", "ThattaTitan", "BadinBruiser", "RawalRebel",
];
const WEAPON_ICONS = ["AK-47", "M4A1", "AWM", "Kar98K", "MP5", "Desert Eagle", "M249", "S12K"];

interface KillEvent {
  id: number;
  killer: string;
  victim: string;
  weapon: string;
  isPlayer: boolean;
}

interface MiniPlayer {
  id: string;
  x: number;
  y: number;
  type: "self" | "ally" | "enemy";
}

interface InventoryItem {
  id: string;
  name: string;
  count: number;
  icon: typeof Heart;
  color: string;
  use: () => void;
}

const POSTURE_LABEL: Record<Posture, string> = { stand: "STAND", crouch: "CROUCH", prone: "PRONE" };

export default function Battle() {
  const [, setLocation] = useLocation();
  const { selectedMap, selectedCharacter, selectedPet, selectedPrimaryGun, selectedSecondaryGun, profile } = useGame();
  const mode = (sessionStorage.getItem("ranjha_battle_mode") as Mode) || "solo";

  const [hp, setHp] = useState(100);
  const [armor, setArmor] = useState(75);
  const [shield, setShield] = useState(50); // protective shield (extra layer)
  const [ammo, setAmmo] = useState(30);
  const [reserveAmmo, setReserveAmmo] = useState(120);
  const [kills, setKills] = useState(0);
  const [alive, setAlive] = useState(49);
  const [zoneTimer, setZoneTimer] = useState(180);
  const [killFeed, setKillFeed] = useState<KillEvent[]>([]);
  const [showVictory, setShowVictory] = useState(false);
  const [paused, setPaused] = useState(false);
  const killIdRef = useRef(0);

  // Free Fire-style state
  const [posture, setPosture] = useState<Posture>("stand");
  const [sprinting, setSprinting] = useState(false);
  const [stamina, setStamina] = useState(100);
  const [showBackpack, setShowBackpack] = useState(false);
  const [medkits, setMedkits] = useState(2);
  const [grenades, setGrenades] = useState(3);
  const [smokes, setSmokes] = useState(2);
  const [energyDrinks, setEnergyDrinks] = useState(3);
  const [shieldKits, setShieldKits] = useState(2);
  const [notice, setNotice] = useState<string | null>(null);

  const teammateCount = mode === "solo" ? 0 : mode === "duo" ? 1 : 3;
  const teammates = useMemo(() => TEAMMATE_NAMES.slice(0, teammateCount).map((name, i) => ({
    name,
    hp: 70 + Math.floor(Math.random() * 30),
    armor: 50 + Math.floor(Math.random() * 50),
    character: ["Heer", "Mirza", "Sultan"][i % 3],
  })), [teammateCount]);

  // Mini-map players
  const [miniPlayers, setMiniPlayers] = useState<MiniPlayer[]>(() => {
    const arr: MiniPlayer[] = [{ id: "self", x: 50, y: 50, type: "self" }];
    teammates.forEach((_, i) => arr.push({ id: `ally_${i}`, x: 48 + Math.random() * 8, y: 48 + Math.random() * 8, type: "ally" }));
    for (let i = 0; i < 12; i++) {
      arr.push({ id: `enemy_${i}`, x: 10 + Math.random() * 80, y: 10 + Math.random() * 80, type: "enemy" });
    }
    return arr;
  });

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(prev => (prev === msg ? null : prev)), 1400);
  };

  // Drift mini-map enemies
  useEffect(() => {
    if (paused || showVictory) return;
    const t = setInterval(() => {
      setMiniPlayers(prev => prev.map(p => p.type === "enemy" ? {
        ...p,
        x: Math.max(5, Math.min(95, p.x + (Math.random() - 0.5) * 4)),
        y: Math.max(5, Math.min(95, p.y + (Math.random() - 0.5) * 4)),
      } : p));
    }, 800);
    return () => clearInterval(t);
  }, [paused, showVictory]);

  // Zone timer
  useEffect(() => {
    if (paused || showVictory) return;
    const t = setInterval(() => setZoneTimer(z => Math.max(0, z - 1)), 1000);
    return () => clearInterval(t);
  }, [paused, showVictory]);

  // Random kill feed events
  useEffect(() => {
    if (paused || showVictory) return;
    const t = setInterval(() => {
      const killer = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
      let victim = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
      while (victim === killer) victim = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
      const weapon = WEAPON_ICONS[Math.floor(Math.random() * WEAPON_ICONS.length)];
      const ev: KillEvent = { id: ++killIdRef.current, killer, victim, weapon, isPlayer: false };
      setKillFeed(prev => [ev, ...prev].slice(0, 6));
      setAlive(a => Math.max(1, a - 1));
    }, 4500);
    return () => clearInterval(t);
  }, [paused, showVictory]);

  // Damage taken — reduced when crouching/prone
  useEffect(() => {
    if (paused || showVictory) return;
    const t = setInterval(() => {
      const reduce = posture === "prone" ? 0.4 : posture === "crouch" ? 0.65 : 1;
      const dmg = Math.floor((Math.random() * 18 + 5) * reduce);
      // damage absorption order: shield → armor → hp
      let remaining = dmg;
      if (shield > 0) {
        const absorb = Math.min(shield, remaining);
        setShield(s => Math.max(0, s - absorb));
        remaining -= absorb;
      }
      if (remaining > 0 && armor > 0) {
        const absorb = Math.min(armor, remaining);
        setArmor(a => Math.max(0, a - absorb));
        remaining -= absorb;
      }
      if (remaining > 0) setHp(h => Math.max(0, h - remaining));
    }, 7000);
    return () => clearInterval(t);
  }, [paused, showVictory, armor, shield, posture]);

  // Stamina drain when sprinting; regen otherwise
  useEffect(() => {
    if (paused || showVictory) return;
    const t = setInterval(() => {
      setStamina(s => {
        if (sprinting && posture === "stand") return Math.max(0, s - 8);
        return Math.min(100, s + 4);
      });
    }, 400);
    return () => clearInterval(t);
  }, [sprinting, posture, paused, showVictory]);

  // Auto-disable sprint when no stamina or not standing
  useEffect(() => {
    if (sprinting && (stamina <= 0 || posture !== "stand")) setSprinting(false);
  }, [stamina, posture, sprinting]);

  // Win condition
  useEffect(() => {
    if (alive <= 1 && !showVictory) setShowVictory(true);
  }, [alive, showVictory]);

  // Death
  useEffect(() => {
    if (hp <= 0) {
      const t = setTimeout(() => setLocation("/lobby"), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [hp, setLocation]);

  const fire = () => {
    if (paused || showVictory || hp <= 0) return;
    if (ammo <= 0) { flash("No ammo — reload!"); return; }
    setAmmo(a => a - 1);
    // Posture affects accuracy: prone +best, crouch +good, sprint -worst
    const baseChance = 0.25;
    const accBonus = posture === "prone" ? 0.18 : posture === "crouch" ? 0.10 : 0;
    const sprintPenalty = sprinting ? 0.15 : 0;
    const hitChance = Math.max(0.05, baseChance + accBonus - sprintPenalty);
    if (Math.random() < hitChance) {
      const victim = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
      const weapon = selectedPrimaryGun?.name || "AK-47";
      const ev: KillEvent = { id: ++killIdRef.current, killer: profile?.name || "You", victim, weapon, isPlayer: true };
      setKillFeed(prev => [ev, ...prev].slice(0, 6));
      setKills(k => k + 1);
      setAlive(a => Math.max(1, a - 1));
    }
  };

  const reload = () => {
    if (reserveAmmo <= 0) { flash("Out of reserve ammo"); return; }
    if (ammo === 30) { flash("Magazine full"); return; }
    const need = 30 - ammo;
    const give = Math.min(need, reserveAmmo);
    setAmmo(a => a + give);
    setReserveAmmo(r => r - give);
    flash("Reloading...");
  };

  // Inventory items
  const inventory: InventoryItem[] = [
    {
      id: "med", name: "Medkit", count: medkits, icon: Heart, color: "text-red-400 border-red-500/40 bg-red-500/15",
      use: () => {
        if (medkits <= 0) return flash("No medkits");
        setMedkits(m => m - 1);
        setHp(h => Math.min(100, h + 75));
        flash("+75 HP");
      },
    },
    {
      id: "shield", name: "Shield Kit", count: shieldKits, icon: Shield, color: "text-cyan-300 border-cyan-500/40 bg-cyan-500/15",
      use: () => {
        if (shieldKits <= 0) return flash("No shield kits");
        setShieldKits(k => k - 1);
        setShield(s => Math.min(100, s + 50));
        flash("+50 Shield");
      },
    },
    {
      id: "energy", name: "Energy", count: energyDrinks, icon: Pill, color: "text-amber-300 border-amber-500/40 bg-amber-500/15",
      use: () => {
        if (energyDrinks <= 0) return flash("No energy drinks");
        setEnergyDrinks(e => e - 1);
        setStamina(100);
        setHp(h => Math.min(100, h + 25));
        flash("Stamina restored");
      },
    },
    {
      id: "grenade", name: "Grenade", count: grenades, icon: Bomb, color: "text-orange-400 border-orange-500/40 bg-orange-500/15",
      use: () => {
        if (grenades <= 0) return flash("No grenades");
        setGrenades(g => g - 1);
        // Chance of multi-kill
        const k = Math.random() < 0.6 ? (Math.random() < 0.3 ? 2 : 1) : 0;
        if (k > 0) {
          for (let i = 0; i < k; i++) {
            const victim = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
            setKillFeed(prev => [{ id: ++killIdRef.current, killer: profile?.name || "You", victim, weapon: "Grenade", isPlayer: true }, ...prev].slice(0, 6));
          }
          setKills(c => c + k);
          setAlive(a => Math.max(1, a - k));
          flash(`Grenade — ${k} kill${k > 1 ? "s" : ""}!`);
        } else {
          flash("Grenade thrown");
        }
      },
    },
    {
      id: "smoke", name: "Smoke", count: smokes, icon: CloudFog, color: "text-slate-300 border-slate-400/40 bg-slate-400/15",
      use: () => {
        if (smokes <= 0) return flash("No smokes");
        setSmokes(s => s - 1);
        flash("Smoke deployed");
      },
    },
  ];

  const cyclePosture = () => {
    setPosture(p => p === "stand" ? "crouch" : p === "crouch" ? "prone" : "stand");
    setSprinting(false);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white select-none">
      {/* Battleground background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${selectedMap.image})`, transform: posture === "prone" ? "scale(1.15) translateY(8%)" : "none", transition: "transform 0.4s" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Crosshair center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className={`relative ${posture === "prone" ? "w-8 h-8" : posture === "crouch" ? "w-10 h-10" : "w-12 h-12"} ${sprinting ? "opacity-30" : "opacity-80"} transition-all`}>
          <div className="absolute top-1/2 left-0 w-full h-px bg-primary" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-primary" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-primary" />
        </div>
      </div>

      {/* Damage flash on low hp */}
      {hp < 30 && hp > 0 && (
        <div className="absolute inset-0 pointer-events-none animate-pulse" style={{ boxShadow: "inset 0 0 200px rgba(193,18,31,0.7)" }} />
      )}

      {/* Top center: zone + kills + alive */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-primary/40 backdrop-blur-md flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-primary" />
          <span className="font-display text-[10px] uppercase tracking-widest text-white/70">Zone</span>
          <span className="font-display text-base font-bold text-primary tabular-nums">
            {Math.floor(zoneTimer / 60)}:{String(zoneTimer % 60).padStart(2, "0")}
          </span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-1.5">
          <Skull className="w-3.5 h-3.5 text-red-400" />
          <span className="font-display text-base font-bold tabular-nums">{alive}</span>
          <span className="font-display text-[9px] uppercase tracking-widest text-white/50">alive</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-primary/40 backdrop-blur-md flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-primary" />
          <span className="font-display text-base font-bold text-primary tabular-nums">{kills}</span>
          <span className="font-display text-[9px] uppercase tracking-widest text-white/50">kills</span>
        </div>
      </div>

      {/* Top right: mode + pause */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-md bg-primary/20 border border-primary/40 text-primary text-[10px] font-display uppercase tracking-widest">
          {mode}
        </div>
        <button
          onClick={() => setPaused(p => !p)}
          className="w-8 h-8 rounded-md bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10"
          data-testid="button-pause"
        >
          <Pause className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mini-map (top-left) */}
      <div className="absolute top-4 left-4 z-20 w-40 h-40 rounded-lg bg-black/70 border border-white/20 backdrop-blur-md overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${selectedMap.image})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-emerald-900/30" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} />
        <div className="absolute top-1/2 left-1/2 w-[70%] h-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/70" />
        {miniPlayers.map(p => (
          <div
            key={p.id}
            className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
              p.type === "self" ? "bg-cyan-400 ring-2 ring-cyan-400/40 w-3 h-3" :
              p.type === "ally" ? "bg-emerald-400 w-2 h-2" :
              "bg-red-500 w-2 h-2"
            }`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          />
        ))}
        <div className="absolute bottom-1 left-2 text-[9px] font-display uppercase tracking-widest text-white/70 truncate max-w-[90%]">
          {selectedMap.name}
        </div>
      </div>

      {/* Kill feed */}
      <div className="absolute top-16 right-4 z-20 w-72 space-y-1">
        <AnimatePresence>
          {killFeed.map(ev => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className={`px-3 py-1.5 rounded backdrop-blur-md text-xs font-display uppercase tracking-wider flex items-center gap-2 justify-end ${
                ev.isPlayer ? "bg-primary/20 border border-primary/40 text-white" : "bg-black/60 border border-white/10 text-white/80"
              }`}
            >
              <span className={ev.isPlayer ? "text-primary font-bold" : ""}>{ev.killer}</span>
              <Crosshair className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-white/40">{ev.weapon}</span>
              <Skull className="w-3 h-3 text-red-400" />
              <span className="text-white/70">{ev.victim}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Squad panel */}
      {teammates.length > 0 && (
        <div className="absolute left-4 top-48 z-20 w-40 space-y-2">
          {teammates.map((tm, i) => (
            <div key={i} className="rounded-lg bg-black/60 border border-emerald-500/30 backdrop-blur-md p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-display uppercase tracking-widest text-emerald-400 truncate">{tm.name}</span>
                <span className="text-[9px] text-white/40 shrink-0 ml-1">{tm.character}</span>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${tm.hp}%` }} />
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${tm.armor}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Center notice flash */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-32 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg bg-black/80 border border-primary/40 backdrop-blur-md font-display text-sm uppercase tracking-widest text-primary"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom-left: HP / Armor / Shield + Character */}
      <div className="absolute bottom-4 left-4 z-20 w-72 space-y-2">
        <div className="rounded-lg bg-black/70 border border-white/10 backdrop-blur-md p-3">
          <div className="flex items-center gap-3 mb-2">
            <img src={selectedCharacter.portrait} alt={selectedCharacter.name} className="w-10 h-10 rounded-full object-cover border border-primary/50" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-display font-bold uppercase text-white tracking-wider truncate">{selectedCharacter.name}</div>
              <div className="text-[10px] text-white/50">LVL {profile?.level} · {POSTURE_LABEL[posture]}</div>
            </div>
            {selectedPet && (
              <img src={selectedPet.image} alt={selectedPet.name} className="w-8 h-8 rounded-full object-cover border border-emerald-500/50" />
            )}
          </div>
          <div className="space-y-1.5">
            <BarRow icon={Heart}    color="from-red-500 to-red-400"     value={hp}     label="HP" />
            <BarRow icon={Shield}   color="from-cyan-500 to-cyan-400"   value={armor}  label="Armor" />
            <BarRow icon={Shield} color="from-fuchsia-500 to-fuchsia-400" value={shield} label="Shield" />
            <BarRow icon={Activity} color="from-amber-500 to-amber-300" value={stamina} label="Stam" small />
          </div>
        </div>
      </div>

      {/* Bottom center: posture + sprint controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-end gap-1.5">
        <PostureButton active={posture === "stand"}  label="Stand"  Icon={ArrowUp}     onClick={() => setPosture("stand")} testId="button-stand" />
        <PostureButton active={posture === "crouch"} label="Crouch" Icon={Wind}        onClick={() => setPosture("crouch")} testId="button-crouch" />
        <PostureButton active={posture === "prone"}  label="Prone"  Icon={ArrowDown}   onClick={() => setPosture("prone")} testId="button-prone" />
        <button
          onClick={() => { if (posture === "stand" && stamina > 10) setSprinting(s => !s); else flash("Must be standing"); }}
          className={`w-12 h-12 rounded-lg border flex flex-col items-center justify-center transition-all ${
            sprinting ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(244,180,26,0.6)]" : "bg-black/60 border-white/10 text-white/70 hover:bg-white/10"
          }`}
          data-testid="button-sprint"
        >
          <Zap className="w-4 h-4" />
          <span className="text-[8px] font-display uppercase tracking-wider">Sprint</span>
        </button>
        <button
          onClick={() => setShowBackpack(true)}
          className="w-12 h-12 rounded-lg bg-black/60 border border-white/10 text-white/80 hover:bg-white/10 flex flex-col items-center justify-center"
          data-testid="button-backpack"
        >
          <Backpack className="w-4 h-4" />
          <span className="text-[8px] font-display uppercase tracking-wider">Bag</span>
        </button>
      </div>

      {/* Bottom-right: items quick-bar + weapon + fire */}
      <div className="absolute bottom-4 right-4 z-20 flex items-end gap-2">
        {/* Item quick bar */}
        <div className="flex flex-col gap-1.5">
          {inventory.map(item => {
            const Icon = item.icon;
            const disabled = item.count <= 0;
            return (
              <button
                key={item.id}
                onClick={item.use}
                disabled={disabled}
                className={`relative w-11 h-11 rounded-lg border flex items-center justify-center transition-all ${item.color} ${disabled ? "opacity-40 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}
                data-testid={`button-item-${item.id}`}
              >
                <Icon className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/90 border border-white/20 text-[9px] font-display font-bold flex items-center justify-center">{item.count}</span>
              </button>
            );
          })}
        </div>

        {/* Weapon panel */}
        <div className="rounded-lg bg-black/70 border border-primary/40 backdrop-blur-md p-3 w-52">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-display uppercase tracking-wider text-white truncate">{selectedPrimaryGun?.name || "AK-47"}</span>
            <span className="ml-auto text-[10px] text-white/40 truncate">{selectedPrimaryGun?.category}</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-3xl font-bold tabular-nums leading-none">{ammo}</div>
              <div className="text-[10px] text-white/50 uppercase tracking-widest">/ {reserveAmmo} reserve</div>
            </div>
            {selectedSecondaryGun && (
              <div className="text-right opacity-60">
                <div className="text-[9px] font-display uppercase">2nd</div>
                <div className="text-[10px] font-display truncate max-w-[70px]">{selectedSecondaryGun.name}</div>
              </div>
            )}
          </div>
        </div>

        {/* Reload + Fire stack */}
        <div className="flex flex-col gap-2">
          <button
            onClick={reload}
            className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex flex-col items-center justify-center hover:bg-cyan-500/30 transition-colors"
            data-testid="button-reload"
          >
            <ChevronUp className="w-4 h-4 text-cyan-400" />
            <span className="text-[8px] font-display uppercase tracking-wider text-cyan-300">Reload</span>
          </button>
          <button
            onClick={fire}
            className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-orange-600 border-2 border-primary shadow-[0_0_30px_rgba(244,180,26,0.6)] active:scale-95 transition-transform flex items-center justify-center"
            data-testid="button-fire"
          >
            <Crosshair className="w-8 h-8 text-black" />
            <span className="absolute -bottom-5 text-[10px] font-display uppercase tracking-widest text-primary">Fire</span>
          </button>
        </div>
      </div>

      {/* Posture/Sprint indicator (top-right under kill feed area) */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 flex flex-col gap-1.5 items-end">
        <div className="px-2 py-1 rounded bg-black/60 border border-white/10 backdrop-blur-md text-[10px] font-display uppercase tracking-widest text-white/70 flex items-center gap-1">
          {posture === "stand" ? <ArrowUp className="w-3 h-3" /> : posture === "crouch" ? <Wind className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {POSTURE_LABEL[posture]}
        </div>
        {sprinting && (
          <div className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/50 text-[10px] font-display uppercase tracking-widest text-amber-300 flex items-center gap-1 animate-pulse">
            <Zap className="w-3 h-3" /> Sprinting
          </div>
        )}
      </div>

      {/* Cosmetic chat row */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        <button onClick={cyclePosture} className="px-2.5 py-1 rounded-md bg-black/60 hover:bg-white/10 border border-white/10 text-[10px] font-display uppercase tracking-widest text-white/70" data-testid="button-cycle-posture">
          Cycle Posture
        </button>
        <button className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10">
          <MessageSquare className="w-3.5 h-3.5 text-white/70" />
        </button>
        <button className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10">
          <Volume2 className="w-3.5 h-3.5 text-white/70" />
        </button>
        <button className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10">
          <Users className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>

      {/* Backpack overlay */}
      <AnimatePresence>
        {showBackpack && hp > 0 && !showVictory && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowBackpack(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-2xl rounded-2xl border border-white/10 bg-card p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <Backpack className="w-6 h-6 text-primary" />
                <h2 className="horror-title text-3xl text-white">Backpack</h2>
                <span className="ml-auto text-[10px] uppercase tracking-widest font-display text-white/50">Capacity Lvl 3</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {inventory.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { item.use(); }}
                      disabled={item.count <= 0}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${item.color} ${item.count <= 0 ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.02]"}`}
                      data-testid={`button-bp-${item.id}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                      <div className="flex-1 text-left">
                        <div className="font-display text-sm font-bold uppercase tracking-wider">{item.name}</div>
                        <div className="text-[10px] uppercase tracking-widest opacity-70">x {item.count}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                <InfoTile label="Primary"   value={selectedPrimaryGun?.name || "—"} />
                <InfoTile label="Secondary" value={selectedSecondaryGun?.name || "—"} />
                <InfoTile label="Pet"       value={selectedPet?.name || "—"} />
              </div>
              <button
                onClick={() => setShowBackpack(false)}
                className="w-full py-3 bg-primary text-black font-display font-bold uppercase tracking-widest rounded-lg"
                data-testid="button-close-backpack"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      <AnimatePresence>
        {paused && !showVictory && hp > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center"
          >
            <div className="rounded-2xl bg-card border border-white/10 p-8 max-w-sm w-full mx-4 space-y-4 text-center">
              <h2 className="horror-title text-4xl text-primary">Paused</h2>
              <p className="text-sm text-white/60">The battle waits for no one. Resume when ready.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setPaused(false)} className="w-full py-3 bg-primary text-black font-display font-bold uppercase tracking-widest rounded-lg" data-testid="button-resume">Resume</button>
                <button onClick={() => setLocation("/lobby")} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-display font-bold uppercase tracking-widest rounded-lg text-sm" data-testid="button-quit">Quit to Lobby</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Death overlay */}
      <AnimatePresence>
        {hp <= 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <Skull className="w-20 h-20 text-red-400 mb-4" />
            <h2 className="horror-title text-6xl text-red-400 mb-2">Eliminated</h2>
            <p className="text-white/70 font-display uppercase tracking-widest text-sm">Returning to lobby...</p>
            <div className="mt-6 text-sm text-white/50">Kills this match: <span className="text-primary font-bold">{kills}</span></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory overlay */}
      <AnimatePresence>
        {showVictory && hp > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-40 bg-gradient-to-b from-amber-900/70 via-black/80 to-black/90 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="text-center space-y-4 px-6">
              <div className="font-display text-sm uppercase tracking-[0.4em] text-primary/80">Booyah</div>
              <h2 className="horror-title text-7xl md:text-8xl text-primary drop-shadow-[0_0_30px_rgba(244,180,26,0.6)]">Victory</h2>
              <p className="text-white/70 font-display uppercase tracking-widest">You are the last legend standing in {selectedMap.name}</p>
              <div className="flex justify-center gap-6 pt-4">
                <Stat label="Kills" value={kills.toString()} color="text-primary" />
                <Stat label="XP" value="+250" color="text-emerald-400" />
                <Stat label="Coins" value="+120" color="text-cyan-400" />
              </div>
              <button
                onClick={() => setLocation("/lobby")}
                className="mt-6 px-8 py-3 bg-primary text-black font-display font-bold uppercase tracking-widest rounded-lg hover:scale-105 transition-transform"
                data-testid="button-victory-lobby"
              >
                Return to Lobby
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BarRow({ icon: Icon, color, value, label, small }: { icon: typeof Heart; color: string; value: number; label: string; small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${
        label === "HP" ? "text-red-400" :
        label === "Armor" ? "text-cyan-400" :
        label === "Shield" ? "text-fuchsia-400" :
        "text-amber-400"
      }`} />
      <div className={`flex-1 ${small ? "h-1.5" : "h-2.5"} rounded-full bg-white/10 overflow-hidden`}>
        <motion.div animate={{ width: `${value}%` }} className={`h-full bg-gradient-to-r ${color}`} />
      </div>
      <span className="font-display text-[11px] font-bold tabular-nums w-7 text-right text-white/80">{Math.round(value)}</span>
    </div>
  );
}

function PostureButton({ active, label, Icon, onClick, testId }: { active: boolean; label: string; Icon: typeof Heart; onClick: () => void; testId: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-lg border flex flex-col items-center justify-center transition-all ${
        active ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(244,180,26,0.5)]" : "bg-black/60 border-white/10 text-white/70 hover:bg-white/10"
      }`}
      data-testid={testId}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[8px] font-display uppercase tracking-wider">{label}</span>
    </button>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/40 border border-white/10 p-3">
      <div className="text-[9px] font-display uppercase tracking-widest text-white/50">{label}</div>
      <div className="font-display text-sm font-bold uppercase tracking-wider text-white truncate">{value}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-3xl font-display font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
    </div>
  );
}
