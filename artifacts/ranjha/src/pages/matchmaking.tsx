import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, Shield } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

type Mode = "solo" | "duo" | "squad";

const MODES: { id: Mode; name: string; squadSize: number; icon: typeof User; tagline: string }[] = [
  { id: "solo", name: "Solo", squadSize: 1, icon: User, tagline: "1 vs 49 — every legend stands alone." },
  { id: "duo", name: "Duo", squadSize: 2, icon: Users, tagline: "Two warriors. One survival." },
  { id: "squad", name: "Squad", squadSize: 4, icon: Shield, tagline: "Four-player squad. Total domination." },
];

export default function Matchmaking() {
  const [, setLocation] = useLocation();
  const { selectedMap } = useGame();
  const [mode, setMode] = useState<Mode | null>(null);
  const [players, setPlayers] = useState<number>(1);
  const [ready, setReady] = useState(false);
  const dropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mode) return;
    setPlayers(1);
    setReady(false);

    // Quickly fill from 1 → 50 in ~1.6 seconds
    const fillInterval = setInterval(() => {
      setPlayers(prev => {
        const next = prev + Math.floor(Math.random() * 8) + 4;
        if (next >= 50) {
          clearInterval(fillInterval);
          setTimeout(() => setReady(true), 200);
          return 50;
        }
        return next;
      });
    }, 120);

    return () => {
      clearInterval(fillInterval);
    };
  }, [mode]);

  // Auto-drop into battleground 1.2s after match is ready
  useEffect(() => {
    if (!ready || !mode) return;
    dropTimerRef.current = setTimeout(() => {
      sessionStorage.setItem("ranjha_battle_mode", mode);
      setLocation("/battle");
    }, 1200);
    return () => {
      if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
    };
  }, [ready, mode, setLocation]);

  const dropIn = () => {
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
    sessionStorage.setItem("ranjha_battle_mode", mode || "solo");
    setLocation("/battle");
  };

  return (
    <div className="relative w-full min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 animate-[pulse_5s_ease-in-out_infinite_alternate]"
        style={{ backgroundImage: `url(${selectedMap.image})` }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <button
        onClick={() => setLocation("/lobby")}
        className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-display uppercase tracking-widest"
      >
        Back to Lobby
      </button>

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-3xl px-6 py-10">
        <div className="text-center">
          <h2 className="font-display text-2xl text-primary tracking-widest uppercase mb-2">Deploying to</h2>
          <h1 className="horror-title text-5xl md:text-6xl text-white tracking-widest">{selectedMap.name}</h1>
        </div>

        <AnimatePresence mode="wait">
          {!mode ? (
            <motion.div
              key="mode-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <h3 className="text-center font-display text-sm text-white/60 uppercase tracking-[0.3em] mb-6">
                Choose your battle mode
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MODES.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <motion.button
                      key={m.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setMode(m.id)}
                      className="relative group rounded-2xl bg-white/5 border border-white/10 hover:border-primary p-6 text-left flex flex-col gap-3 backdrop-blur-md transition-all overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-display text-2xl uppercase font-bold text-white tracking-wider">
                            {m.name}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                            Squad of {m.squadSize}
                          </div>
                        </div>
                      </div>
                      <p className="relative text-xs text-white/60 leading-relaxed">{m.tagline}</p>
                      <div className="relative flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-[10px] uppercase tracking-widest text-white/40">50 players</span>
                        <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Select →</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="finding"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-xl"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-6 relative overflow-hidden">
                <div className="absolute top-3 right-3 px-2 py-1 rounded bg-primary/20 border border-primary/40 text-[10px] font-display uppercase tracking-widest text-primary">
                  {MODES.find(m => m.id === mode)?.name} Mode
                </div>

                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <motion.circle
                      cx="96" cy="96" r="90" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                      strokeDasharray="565.48"
                      strokeDashoffset={565.48 - (565.48 * (players / 50))}
                      className="transition-all duration-200 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-display text-5xl font-bold">{players}</span>
                    <span className="text-sm text-white/50 uppercase tracking-widest">/ 50 Players</span>
                  </div>
                </div>

                <div className="text-center h-8">
                  <AnimatePresence mode="wait">
                    {!ready ? (
                      <motion.span
                        key="finding-text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-display text-xl text-white/80 uppercase tracking-widest animate-pulse"
                      >
                        Finding Match...
                      </motion.span>
                    ) : (
                      <motion.span
                        key="ready"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="font-display text-2xl text-primary font-bold uppercase tracking-[0.2em]"
                      >
                        Dropping In...
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={dropIn}
                  className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-xl uppercase tracking-widest rounded-xl mt-2 shadow-[0_0_20px_rgba(244,180,26,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Drop In Now
                </button>

                <button
                  onClick={() => { setMode(null); setPlayers(1); setReady(false); }}
                  className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white/70"
                >
                  Change mode
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
