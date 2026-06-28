import React, { useState } from "react";
import { ChevronLeft, Check } from "lucide-react";

export function ContemporaryDesi() {
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  const maps = [
    {
      id: "hunza",
      name: "Hunza Valley",
      description: "Karakoram mountain ranges, glaciers, sharp peaks",
      biome: "Alpine",
      accent: "#3b82f6", // glacier blue
      playerCount: "84%",
    },
    {
      id: "lahore",
      name: "Lahore Fort",
      description: "Mughal ruins, broken arches, red brick",
      biome: "Urban Ruins",
      accent: "#ef4444", // brick red
      playerCount: "92%",
    },
    {
      id: "multan",
      name: "Multan Desert",
      description: "Sandy dunes, adobe domed structures",
      biome: "Desert",
      accent: "#eab308", // sand gold
      playerCount: "65%",
    },
    {
      id: "karachi",
      name: "Karachi Coast",
      description: "Ocean waves, glass towers, broken buildings",
      biome: "Coastal",
      accent: "#14b8a6", // ocean teal
      playerCount: "78%",
    },
  ];

  const heroLooks: Record<string, { skin: string; cloth: string; pants: string; hair: string; accent: string; weapon: string }> = {
    hunza: { skin: "#d8b08c", cloth: "#3b82f6", pants: "#1e293b", hair: "#111827", accent: "#93c5fd", weapon: "🎯" },
    lahore: { skin: "#d9b08a", cloth: "#ef4444", pants: "#2a1a1a", hair: "#130b0b", accent: "#fca5a5", weapon: "🗡" },
    multan: { skin: "#d5a57a", cloth: "#eab308", pants: "#5b3a16", hair: "#3b2410", accent: "#fde68a", weapon: "🏹" },
    karachi: { skin: "#d3a57f", cloth: "#14b8a6", pants: "#0f172a", hair: "#101420", accent: "#5eead4", weapon: "🔫" },
  };

  function HeroCard({ mapId }: { mapId: string }) {
    const h = heroLooks[mapId];
    return (
      <div className="relative h-20 w-16 shrink-0">
        <div className="absolute inset-x-1 bottom-0 h-2 rounded-full bg-black/30 blur-sm" />
        <div className="absolute left-1/2 top-1 -translate-x-1/2">
          <div className="relative">
            <div className="w-5 h-5 rounded-full" style={{ background: h.skin }} />
            <div className="absolute -top-1 -left-1 w-7 h-4 rounded-t-full" style={{ background: h.hair }} />
          </div>
        </div>
        <div className="absolute left-1/2 top-6 -translate-x-1/2 w-7 h-8 rounded-md" style={{ background: h.cloth }} />
        <div className="absolute left-[18px] top-7 w-1.5 h-7 rounded-full rotate-[18deg]" style={{ background: h.skin }} />
        <div className="absolute right-[18px] top-7 w-1.5 h-7 rounded-full -rotate-[18deg]" style={{ background: h.skin }} />
        <div className="absolute left-[18px] top-12 w-1.5 h-7 rounded-full rotate-[4deg]" style={{ background: h.pants }} />
        <div className="absolute right-[18px] top-12 w-1.5 h-7 rounded-full -rotate-[4deg]" style={{ background: h.pants }} />
        <div className="absolute right-0 top-8 text-[18px]" style={{ filter: `drop-shadow(0 0 8px ${h.accent})` }}>
          {h.weapon}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-[100dvh] flex justify-center bg-black overflow-hidden relative font-sans"
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        backgroundColor: "#040f06",
      }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
          
          .desi-grid {
            background-image: linear-gradient(#01411C15 1px, transparent 1px),
              linear-gradient(90deg, #01411C15 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .desi-sheen {
            background: radial-gradient(circle at top, rgba(232,160,32,0.18), transparent 45%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 22%);
          }
          
          .crescent {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            box-shadow: 4px -4px 0 0 white;
            transform: rotate(45deg);
          }
          
          .star {
            width: 8px;
            height: 8px;
            background: white;
            clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          }

          /* Urdu-inspired diacritical mark (nuqta) decoration */
          .nuqta::after {
            content: '';
            position: absolute;
            width: 4px;
            height: 4px;
            background-color: #E8A020;
            transform: rotate(45deg);
            bottom: -6px;
            right: 0;
          }
        `}
      </style>

      {/* Mobile Container */}
      <div className="w-full max-w-[390px] h-full relative flex flex-col desi-grid desi-sheen bg-[#031009]">
        {/* Header */}
        <header className="px-6 pt-12 pb-6 relative z-10 flex flex-col gap-4 border-b border-[#01411C]/30">
          <button className="flex items-center text-zinc-400 hover:text-white transition-colors w-fit group bg-white/5 border border-white/10 rounded-full px-3 py-2 backdrop-blur">
            <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span className="uppercase text-sm tracking-widest font-medium">Lobby</span>
          </button>

          <div className="flex items-start justify-between">
            <div className="relative inline-block">
              <h1 className="text-4xl font-bold text-white tracking-tight nuqta">
                RANJHA
              </h1>
              <div className="h-1.5 w-full bg-[#01411C] mt-1 relative">
                <div className="absolute right-0 top-0 w-1/3 h-full bg-[#E8A020]"></div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 pt-2">
              <div className="crescent"></div>
              <div className="star -mt-3 -ml-1"></div>
            </div>
          </div>
          
          <div className="text-zinc-400 text-sm tracking-[0.28em] mt-2 uppercase">
            SELECT DEPLOYMENT ZONE
          </div>
        </header>

        {/* Map List */}
        <main className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5 z-10 no-scrollbar">
          {maps.map((map) => {
            const isSelected = selectedMap === map.id;
            
            return (
              <div
                key={map.id}
                onClick={() => setSelectedMap(map.id)}
                className={`relative bg-[#0d1117] border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col rounded-[1.25rem] ${
                  isSelected ? 'border-[#E8A020] shadow-[0_0_34px_rgba(232,160,32,0.2)] scale-[1.015]' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Left Color Band */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: map.accent }}
                />

                {/* AI-generated map preview */}
                <div className="relative w-full h-28 overflow-hidden">
                  <img
                    src={`/map-${map.id}.png`}
                    alt={map.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117]/90 via-[#0d1117]/10 to-transparent"/>
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1.5"
                    style={{ backgroundColor: map.accent }}
                  />
                  <div className="absolute top-2 right-3">
                    <span
                      className="text-[10px] px-2 py-0.5 uppercase font-bold tracking-wider text-[#040f06]"
                      style={{ backgroundColor: map.accent }}
                    >
                      {map.biome}
                    </span>
                  </div>
                </div>
                <div className="p-5 pl-6 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <HeroCard mapId={map.id} />
                      <h3 className="text-xl font-bold text-white tracking-[0.16em]">
                        {map.name}
                      </h3>
                    </div>
                    <span 
                      className="text-xs px-2 py-1 uppercase font-bold tracking-wider text-[#040f06]"
                      style={{ backgroundColor: map.accent }}
                    >
                      {map.biome}
                    </span>
                  </div>
                  
                  <p className="text-sm text-zinc-400 leading-snug">
                    {map.description}
                  </p>

                  <div className="mt-2 flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs text-zinc-500 font-medium uppercase">
                      <span>Activity Level</span>
                      <span>{map.playerCount}</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-none overflow-hidden">
                      <div 
                        className="h-full bg-zinc-600"
                        style={{ width: map.playerCount }}
                      />
                    </div>
                  </div>
                  
                  {isSelected && (
                    <button className="mt-3 w-full bg-[#01411C] hover:bg-[#015423] text-white py-3 font-bold uppercase tracking-[0.24em] transition-colors flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-black/20">
                      <Check className="w-4 h-4" />
                      Deploy Here
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </main>
        
        {/* Fade Out at Bottom */}
        <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-[#040f06] to-transparent pointer-events-none z-20"></div>
      </div>
    </div>
  );
}
