import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import bgSplash from "@/assets/images/bg-splash.png";
import { useGame } from "@/contexts/GameContext";

const SLIDES = [
  { text: "WHERE LEGENDS RISE" },
  { text: "THE LAND BURNS" },
  { text: "BECOME RANJHA" }
];

export default function Splash() {
  const [, setLocation] = useLocation();
  const { profile } = useGame();
  const [slideIndex, setSlideIndex] = useState(-1);
  const [showRanjha, setShowRanjha] = useState(false);

  // Agar user pehle se login hai (username/profile already maujood hai),
  // to login screen dikhaye bagair seedha lobby khol dein.
  useEffect(() => {
    if (profile) {
      setLocation("/lobby");
    }
  }, [profile, setLocation]);

  useEffect(() => {
    if (profile) return; // already logged in — splash animation skip
    // Show RANJHA text first
    setShowRanjha(true);

    const timer = setTimeout(() => {
      setShowRanjha(false);
      setSlideIndex(0);
    }, 2000);

    return () => clearTimeout(timer);
  }, [profile]);

  useEffect(() => {
    if (profile) return;
    if (slideIndex >= 0 && slideIndex < SLIDES.length) {
      const timer = setTimeout(() => {
        setSlideIndex(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (slideIndex === SLIDES.length) {
      const timer = setTimeout(() => {
        setLocation("/login");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [slideIndex, setLocation, profile]);

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-black cursor-pointer"
      onClick={() => setLocation("/login")}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity scale-110 animate-[pulse_10s_ease-in-out_infinite_alternate]"
        style={{ backgroundImage: `url(${bgSplash})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black" />

      <AnimatePresence mode="wait">
        {showRanjha && (
          <motion.div
            key="ranjha"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0.8, 1, 1.05, 1.1],
              filter: ["blur(10px)", "blur(0px)", "blur(0px)", "blur(10px)"]
            }}
            transition={{ duration: 2, times: [0, 0.2, 0.8, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <h1 className="horror-title text-8xl md:text-[12rem] text-red-600 tracking-widest drop-shadow-[0_0_30px_rgba(220,38,38,0.8)]">
              RANJHA
            </h1>
          </motion.div>
        )}

        {slideIndex >= 0 && slideIndex < SLIDES.length && (
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <h2 className="font-display font-black text-4xl md:text-6xl text-white tracking-[0.2em] text-center uppercase neon-text-glow">
              {SLIDES[slideIndex].text}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 right-8 text-white/50 font-display tracking-widest text-sm animate-pulse">
        TAP TO SKIP
      </div>
    </div>
  );
}
