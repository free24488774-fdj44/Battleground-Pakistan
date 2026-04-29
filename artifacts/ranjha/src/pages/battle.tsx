import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Shield, Crosshair, Users, Skull, MessageSquare, Volume2, ChevronUp, Flame, Pause } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

type Mode = "solo" | "duo" | "squad";

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
  x: number; // % position on minimap
  y: number;
  type: "self" | "ally" | "enemy";
}

export default function Battle() {
  const [, setLocation] = useLocation();
  const { selectedMap, selectedCharacter, selectedPet, selectedPrimaryGun, selectedSecondaryGun, profile } = useGame();
  const mode = (sessionStorage.getItem("ranjha_battle_mode") as Mode) || "solo";

  const [hp, setHp] = useState(100);
  const [armor, setArmor] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [reserveAmmo, setReserveAmmo] = useState(120);
  const [kills, setKills] = useState(0);
  const [alive, setAlive] = useState(49);
  const [zoneTimer, setZoneTimer] = useState(180);
  const [killFeed, setKillFeed] = useState<KillEvent[]>([]);
  const [showVictory, setShowVictory] = useState(false);
  const [paused, setPaused] = useState(false);
  const killIdRef = useRef(0);

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

  // Random damage taken
  useEffect(() => {
    if (paused || showVictory) return;
    const t = setInterval(() => {
      const dmg = Math.floor(Math.random() * 18) + 5;
      if (armor > 0) {
        setArmor(a => Math.max(0, a - dmg));
      } else {
        setHp(h => Math.max(0, h - dmg));
      }
    }, 7000);
    return () => clearInterval(t);
  }, [paused, showVictory, armor]);

  // Win condition
  useEffect(() => {
    if (alive <= 1 && !showVictory) setShowVictory(true);
  }, [alive, showVictory]);

  // Death = back to lobby
  useEffect(() => {
    if (hp <= 0) {
      const t = setTimeout(() => setLocation("/lobby"), 2500);
      return () => clearTimeout(t);
    }
  }, [hp, setLocation]);

  const fire = () => {
    if (paused || showVictory || hp <= 0) return;
    if (ammo <= 0) return;
    setAmmo(a => a - 1);
    // 25% chance to score a kill
    if (Math.random() < 0.25) {
      const victim = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
      const weapon = selectedPrimaryGun?.name || "AK-47";
      const ev: KillEvent = { id: ++killIdRef.current, killer: profile?.name || "You", victim, weapon, isPlayer: true };
      setKillFeed(prev => [ev, ...prev].slice(0, 6));
      setKills(k => k + 1);
      setAlive(a => Math.max(1, a - 1));
    }
  };

  const reload = () => {
    if (reserveAmmo <= 0) return;
    const need = 30 - ammo;
    const give = Math.min(need, reserveAmmo);
    setAmmo(a => a + give);
    setReserveAmmo(r => r - give);
  };

  const useMedkit = () => {
    setHp(h => Math.min(100, h + 50));
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white select-none">
      {/* Battleground background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${selectedMap.image})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Crosshair center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="relative w-12 h-12">
          <div className="absolute top-1/2 left-0 w-full h-px bg-primary/80" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-primary/80" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-primary/80" />
        </div>
      </div>

      {/* Damage flash on low hp */}
      {hp < 30 && hp > 0 && (
        <div className="absolute inset-0 pointer-events-none animate-pulse" style={{ boxShadow: "inset 0 0 200px rgba(193,18,31,0.7)" }} />
      )}

      {/* Top HUD: zone timer + alive */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <div className="px-4 py-2 rounded-lg bg-black/60 border border-primary/40 backdrop-blur-md flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          <span className="font-display text-sm uppercase tracking-widest text-white/70">Zone</span>
          <span className="font-display text-lg font-bold text-primary tabular-nums">
            {Math.floor(zoneTimer / 60)}:{String(zoneTimer % 60).padStart(2, "0")}
          </span>
        </div>
        <div className="px-4 py-2 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2">
          <Skull className="w-4 h-4 text-red-400" />
          <span className="font-display text-lg font-bold text-white tabular-nums">{alive}</span>
          <span className="font-display text-[10px] uppercase tracking-widest text-white/50">alive</span>
        </div>
        <div className="px-4 py-2 rounded-lg bg-black/60 border border-primary/40 backdrop-blur-md flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary" />
          <span className="font-display text-lg font-bold text-primary tabular-nums">{kills}</span>
          <span className="font-display text-[10px] uppercase tracking-widest text-white/50">kills</span>
        </div>
      </div>

      {/* Top-right: pause + mode badge */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-md bg-primary/20 border border-primary/40 text-primary text-[10px] font-display uppercase tracking-widest">
          {mode} Mode
        </div>
        <button
          onClick={() => setPaused(p => !p)}
          className="w-9 h-9 rounded-md bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>

      {/* Mini-map (top-left) */}
      <div className="absolute top-4 left-4 z-20 w-44 h-44 rounded-lg bg-black/70 border border-white/20 backdrop-blur-md overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: `url(${selectedMap.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-emerald-900/30" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} />
        {/* Zone circle */}
        <div className="absolute top-1/2 left-1/2 w-[70%] h-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/70" />
        {/* Players */}
        {miniPlayers.map(p => (
          <div
            key={p.id}
            className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
              p.type === "self" ? "bg-cyan-400 ring-2 ring-cyan-400/40 w-3 h-3" :
              p.type === "ally" ? "bg-emerald-400" :
              "bg-red-500"
            }`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          />
        ))}
        <div className="absolute bottom-1 left-2 text-[9px] font-display uppercase tracking-widest text-white/70">
          {selectedMap.name}
        </div>
      </div>

      {/* Kill feed (top-right under mode badge) */}
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

      {/* Squad panel (left-mid) for duo/squad */}
      {teammates.length > 0 && (
        <div className="absolute left-4 top-52 z-20 w-44 space-y-2">
          {teammates.map((tm, i) => (
            <div key={i} className="rounded-lg bg-black/60 border border-emerald-500/30 backdrop-blur-md p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-display uppercase tracking-widest text-emerald-400">{tm.name}</span>
                <span className="text-[9px] text-white/40">{tm.character}</span>
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

      {/* Bottom-left: HP / Armor / Character */}
      <div className="absolute bottom-4 left-4 z-20 w-72 space-y-2">
        <div className="rounded-lg bg-black/70 border border-white/10 backdrop-blur-md p-3">
          <div className="flex items-center gap-3 mb-2">
            <img src={selectedCharacter.image} alt={selectedCharacter.name} className="w-10 h-10 rounded-full object-cover border border-primary/50" />
            <div className="flex-1">
              <div className="text-xs font-display font-bold uppercase text-white tracking-wider">{selectedCharacter.name}</div>
              <div className="text-[10px] text-white/50">LVL {profile?.level}</div>
            </div>
            {selectedPet && (
              <img src={selectedPet.image} alt={selectedPet.name} className="w-8 h-8 rounded-full object-cover border border-emerald-500/50" />
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div animate={{ width: `${hp}%` }} className="h-full bg-gradient-to-r from-red-500 to-red-400" />
              </div>
              <span className="font-display text-xs font-bold tabular-nums w-8 text-right">{hp}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div animate={{ width: `${armor}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400" />
              </div>
              <span className="font-display text-xs font-bold tabular-nums w-8 text-right">{armor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-right: weapon + ammo + actions */}
      <div className="absolute bottom-4 right-4 z-20 flex items-end gap-3">
        <div className="flex flex-col gap-2">
          <button
            onClick={useMedkit}
            className="w-12 h-12 rounded-lg bg-red-500/20 border border-red-500/40 flex flex-col items-center justify-center hover:bg-red-500/30 transition-colors"
          >
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-[8px] font-display uppercase tracking-wider text-red-300">Med</span>
          </button>
          <button
            onClick={reload}
            className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex flex-col items-center justify-center hover:bg-cyan-500/30 transition-colors"
          >
            <ChevronUp className="w-4 h-4 text-cyan-400" />
            <span className="text-[8px] font-display uppercase tracking-wider text-cyan-300">Reload</span>
          </button>
        </div>

        <div className="rounded-lg bg-black/70 border border-primary/40 backdrop-blur-md p-3 w-56">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-display uppercase tracking-wider text-white">{selectedPrimaryGun?.name || "AK-47"}</span>
            <span className="ml-auto text-[10px] text-white/40">{selectedPrimaryGun?.category}</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-3xl font-bold tabular-nums leading-none">{ammo}</div>
              <div className="text-[10px] text-white/50 uppercase tracking-widest">/ {reserveAmmo} reserve</div>
            </div>
            {selectedSecondaryGun && (
              <div className="text-right opacity-50">
                <div className="text-[10px] font-display uppercase">2nd</div>
                <div className="text-xs font-display">{selectedSecondaryGun.name}</div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={fire}
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-orange-600 border-2 border-primary shadow-[0_0_30px_rgba(244,180,26,0.6)] active:scale-95 transition-transform flex items-center justify-center group"
        >
          <Crosshair className="w-8 h-8 text-black" />
          <span className="absolute -bottom-5 text-[10px] font-display uppercase tracking-widest text-primary">Fire</span>
        </button>
      </div>

      {/* Bottom-center: chat / voice (cosmetic) */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        <button className="w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10">
          <MessageSquare className="w-4 h-4 text-white/70" />
        </button>
        <button className="w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10">
          <Volume2 className="w-4 h-4 text-white/70" />
        </button>
        <button className="w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10">
          <Users className="w-4 h-4 text-white/70" />
        </button>
      </div>

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
                <button onClick={() => setPaused(false)} className="w-full py-3 bg-primary text-black font-display font-bold uppercase tracking-widest rounded-lg">Resume</button>
                <button onClick={() => setLocation("/lobby")} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-display font-bold uppercase tracking-widest rounded-lg text-sm">Quit to Lobby</button>
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
                <div className="text-center">
                  <div className="text-3xl font-display font-bold text-primary">{kills}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Kills</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-display font-bold text-emerald-400">+250</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">XP</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-display font-bold text-cyan-400">+120</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Coins</div>
                </div>
              </div>
              <button
                onClick={() => setLocation("/lobby")}
                className="mt-6 px-8 py-3 bg-primary text-black font-display font-bold uppercase tracking-widest rounded-lg hover:scale-105 transition-transform"
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
