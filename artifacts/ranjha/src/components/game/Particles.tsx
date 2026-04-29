import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function Particles({ count = 20, type = "ember" }: { count?: number; type?: "ember" | "smoke" }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (type === "ember" ? 4 : 20) + 2,
      duration: Math.random() * 5 + 3,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
  }, [count, type]);

  if (type === "smoke") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white/5 blur-xl"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size * 5,
              height: p.size * 5,
            }}
            animate={{
              y: ["0%", "-50%", "-100%"],
              x: ["0%", "10%", "-10%", "0%"],
              opacity: [0, 0.5, 0],
              scale: [1, 2, 3]
            }}
            transition={{
              duration: p.duration * 2,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            boxShadow: `0 0 ${p.size * 2}px hsl(var(--primary))`
          }}
          animate={{
            y: ["0%", "-100%"],
            x: ["0%", "20%", "-20%", "0%"],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}
