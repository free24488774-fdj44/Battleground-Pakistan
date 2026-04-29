import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

export default function Matchmaking() {
  const [, setLocation] = useLocation();
  const { selectedMap } = useGame();
  const [players, setPlayers] = useState<number>(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (players < 50) {
      interval = setInterval(() => {
        setPlayers(prev => {
          const next = prev + Math.floor(Math.random() * 5) + 1;
          if (next >= 50) {
            clearInterval(interval);
            setTimeout(() => setReady(true), 500);
            return 50;
          }
          return next;
        });
      }, 300);
    }

    return () => clearInterval(interval);
  }, [players]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans text-white">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 animate-[pulse_5s_ease-in-out_infinite_alternate]"
        style={{ backgroundImage: `url(${selectedMap.image})` }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-2xl px-6">
        <div className="text-center">
          <h2 className="font-display text-2xl text-primary tracking-widest uppercase mb-2">Deploying to</h2>
          <h1 className="horror-title text-6xl text-white tracking-widest">{selectedMap.name}</h1>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-6 relative overflow-hidden">
          {/* Progress ring */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <motion.circle 
                cx="96" cy="96" r="90" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                strokeDasharray="565.48"
                strokeDashoffset={565.48 - (565.48 * (players / 50))}
                className="transition-all duration-300 ease-out"
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
                  key="finding"
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
                  Match Ready
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {ready && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLocation("/lobby")}
                className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-xl uppercase tracking-widest rounded-xl mt-4 shadow-[0_0_20px_rgba(244,180,26,0.4)]"
              >
                Drop In
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
